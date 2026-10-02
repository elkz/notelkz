(function () {
  "use strict";

  var S = window.SITE || {};

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else if (k === "style") node.style.cssText = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function hideSection(id) {
    var s = document.getElementById(id);
    if (s) s.hidden = true;
    var link = document.querySelector('.line a[href="#' + id + '"]');
    if (link) link.parentElement.hidden = true;
  }

  // ── Simple text bindings ──────────────────────────────────
  document.querySelectorAll("[data-bind]").forEach(function (node) {
    var v = S[node.getAttribute("data-bind")];
    if (v) node.textContent = v; else if (node.tagName === "P") node.hidden = true;
  });
  if (S.name) document.title = S.name + " — " + (S.tagline || "streams & projects");
  document.getElementById("year").textContent = new Date().getFullYear();

  // ── Socials ───────────────────────────────────────────────
  function renderSocials(listId) {
    var list = document.getElementById(listId);
    (S.socials || []).forEach(function (s) {
      list.appendChild(el("li", {}, [
        el("a", { href: s.url, target: "_blank", rel: "noopener me", style: "--c:" + (s.color || "var(--blue)"), text: s.label }),
      ]));
    });
    if (!list.children.length) list.hidden = true;
  }
  renderSocials("hero-socials");
  renderSocials("contact-socials");

  if (S.email) {
    var mail = document.getElementById("email");
    mail.appendChild(el("a", { href: "mailto:" + S.email, text: S.email }));
  }

  // ── Schedule board ────────────────────────────────────────
  var board = document.getElementById("board");
  var today = new Date().toLocaleDateString("en-GB", { weekday: "long" }).toLowerCase();
  (S.schedule || []).forEach(function (row) {
    var li = el("li", { class: "board__row" }, [
      el("span", { class: "board__day", text: row.day }),
      el("span", { class: "board__what", text: row.what || "" }),
      el("span", { class: "board__time", text: row.time || "" }),
    ]);
    if ((row.day || "").toLowerCase() === today) {
      li.classList.add("is-today");
      li.appendChild(el("span", { class: "board__tag", text: "Today" }));
    }
    board.appendChild(li);
  });
  if (!board.children.length) hideSection("schedule");

  // ── About ─────────────────────────────────────────────────
  var aboutText = document.getElementById("about-text");
  (S.about || []).forEach(function (p) { aboutText.appendChild(el("p", { text: p })); });
  var facts = document.getElementById("facts");
  (S.facts || []).forEach(function (f) {
    facts.appendChild(el("div", {}, [el("dt", { text: f.label }), el("dd", { text: f.value })]));
  });
  if (!facts.children.length) facts.hidden = true;
  if (!aboutText.children.length && !facts.children.length) hideSection("about");

  // ── Projects ──────────────────────────────────────────────
  var cards = document.getElementById("cards");
  (S.projects || []).forEach(function (p, i) {
    var tags = el("ul", { class: "card__tags" }, (p.tags || []).map(function (t) { return el("li", { text: t }); }));
    var body = [
      el("span", { class: "card__num", text: String(i + 1).padStart(2, "0") }),
      el("h3", { text: p.title }),
      el("p", { text: p.blurb || "" }),
      tags.children.length ? tags : null,
    ];
    var inner = p.url
      ? el("a", { class: "card", href: p.url, target: "_blank", rel: "noopener" }, body)
      : el("div", { class: "card" }, body);
    cards.appendChild(el("li", {}, [inner]));
  });
  if (!cards.children.length) hideSection("projects");

  // ── Twitch player + live status ──────────────────────────
  var status = document.getElementById("status");
  function setStatus(state, text) {
    status.setAttribute("data-state", state);
    status.querySelector(".status__text").textContent = text;
  }

  var player = document.getElementById("player");
  var host = window.location.hostname;

  if (!S.twitch) {
    hideSection("live");
    status.hidden = true;
  } else if (!host) {
    // Twitch embeds need a real hostname (they refuse file://).
    player.innerHTML = "";
    player.appendChild(el("p", { class: "player__fallback" }, [
      document.createTextNode("Preview the site through a local server to see the player — or "),
      el("a", { href: "https://twitch.tv/" + S.twitch, target: "_blank", rel: "noopener", text: "watch on Twitch" }),
      document.createTextNode("."),
    ]));
    setStatus("unknown", "twitch.tv/" + S.twitch);
  } else {
    var script = document.createElement("script");
    script.src = "https://player.twitch.tv/js/embed/v1.js";
    script.onload = function () {
      player.innerHTML = "";
      var p = new window.Twitch.Player("player", {
        channel: S.twitch,
        parent: [host],
        width: "100%",
        height: "100%",
        muted: true,
        autoplay: true,
      });
      p.addEventListener(window.Twitch.Player.ONLINE, function () {
        setStatus("live", "Live now");
        document.body.classList.add("is-live");
      });
      p.addEventListener(window.Twitch.Player.OFFLINE, function () {
        setStatus("offline", "Offline — check the schedule");
        document.body.classList.remove("is-live");
      });
    };
    script.onerror = function () {
      setStatus("unknown", "twitch.tv/" + S.twitch);
      player.querySelector(".player__fallback").textContent = "Couldn't load the Twitch player.";
    };
    document.head.appendChild(script);
  }

  // ── Highlight the current "station" in the nav ───────────
  var links = Array.prototype.slice.call(document.querySelectorAll(".line a"));
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle("is-here", a.getAttribute("href") === "#" + e.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { io.observe(s); });
  }
})();
