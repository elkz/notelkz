// Loads and validates everything in /content. Errors name the file and field,
// so a typo in a JSON or Markdown file fails the build with a clear message.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { Marked } from 'marked';
import { parseFrontmatter } from './frontmatter.mjs';
import { esc } from './html.mjs';

const marked = new Marked({ gfm: true });

// External links in Markdown get rel="noopener" and a hint for screen readers.
marked.use({
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const external = /^https?:\/\//.test(href) && !href.startsWith('https://notelkz.net');
      const t = title ? ` title="${esc(title)}"` : '';
      href = esc(href);
      return external
        ? `<a href="${href}"${t} rel="noopener">${text}<span class="visually-hidden"> (external site)</span></a>`
        : `<a href="${href}"${t}>${text}</a>`;
    },
  },
});

export const md = (s) => marked.parse(s ?? '');
export const mdInline = (s) => marked.parseInline(s ?? '');

function need(obj, keys, where) {
  for (const k of keys) {
    if (obj[k] === undefined || obj[k] === null || obj[k] === '') {
      throw new Error(`${where}: missing required field "${k}"`);
    }
  }
}

async function json(dir, name) {
  const file = path.join(dir, name);
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    throw new Error(`content/${name}: ${err.message}`);
  }
}

export async function loadContent(dir) {
  const site = await json(dir, 'site.json');
  need(site, ['name', 'handle', 'url', 'twitch'], 'content/site.json');
  site.socials.forEach((s, i) => need(s, ['id', 'label', 'url'], `content/site.json socials[${i}]`));

  const setup = await json(dir, 'setup.json');
  setup.lines.forEach((l) => {
    need(l, ['id', 'name', 'items'], `content/setup.json line`);
    l.items.forEach((it) => need(it, ['role', 'name'], `content/setup.json "${l.name}" item`));
  });

  const { games } = await json(dir, 'games.json');

  // About page: everything under "## History" becomes the timeline.
  const aboutSrc = parseFrontmatter(await readFile(path.join(dir, 'about.md'), 'utf8'), 'content/about.md');
  const [bodyMd, historyMd = ''] = aboutSrc.body.split(/^##\s+History\s*$/m);
  const history = historyMd
    .split('\n')
    .map((l) => /^\s*[-*]\s+([^:]+?):\s+(.+)$/.exec(l))
    .filter(Boolean)
    .map((m) => ({ when: m[1].trim(), what: m[2].trim() }));
  const about = { ...aboutSrc.data, html: md(bodyMd), history };

  // Portfolio: one Markdown file per project.
  const workDir = path.join(dir, 'work');
  const files = (await readdir(workDir)).filter((f) => f.endsWith('.md'));
  const work = [];
  for (const f of files) {
    const where = `content/work/${f}`;
    const { data, body } = parseFrontmatter(await readFile(path.join(workDir, f), 'utf8'), where);
    if (data.draft) continue;
    need(data, ['title', 'summary'], where);
    work.push({
      slug: f.replace(/\.md$/, ''),
      stack: [],
      order: 99,
      ...data,
      html: md(body),
    });
  }
  work.sort((a, b) => (a.order - b.order) || String(b.year).localeCompare(String(a.year)));

  return { site, setup, games, about, work };
}
