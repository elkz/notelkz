// The hero stag: the logo rebuilt from ~25k WebGL particles.
// They fly in from the dark and settle into the stag, the eyes burn hottest,
// a green scan line sweeps the face, the cursor pushes particles aside,
// and scrolling away scatters them again. Raw WebGL, no library.
// Fallback: the static logo stays visible if WebGL is unavailable.

const SRC = '/img/stag-400.png';
const SAMPLE_W = 200;            // sampling grid width; height follows the image aspect
const WORLD_H = 6.2;             // height of the assembled stag in world units
const CAMERA_Z = 11;

const VERT = `
attribute vec3 aTarget;
attribute vec3 aStart;
attribute vec4 aColor;
attribute float aSize;
attribute float aRand;
uniform mat4 uProj;
uniform mat4 uModel;
uniform float uProgress;
uniform float uScatter;
uniform float uTime;
uniform float uDpr;
uniform float uScale;
uniform vec2 uMouse;
uniform float uMouseOn;
varying vec4 vColor;

float easeOut(float t) { return 1.0 - pow(1.0 - t, 3.0); }

void main() {
  float p = easeOut(clamp(uProgress * 1.4 - aRand * 0.4, 0.0, 1.0));
  vec3 pos = mix(aStart, aTarget, p);

  // breathing
  pos.z += sin(uTime * 0.8 + aTarget.x * 1.7 + aTarget.y * 1.1) * 0.05 * p;

  // cursor pushes particles out of the way
  vec2 d = pos.xy - uMouse;
  float f = smoothstep(1.1, 0.0, length(d)) * uMouseOn * p;
  pos.xy += normalize(d + 0.0001) * f * 0.42;
  pos.z += f * 0.9;

  // scrolling away scatters the stag back into the dark
  float s = smoothstep(0.0, 1.0, uScatter * (0.6 + aRand * 0.8));
  pos = mix(pos, aStart * 1.3, s);

  // green scan line sweeping down the assembled face
  float scanY = 3.6 - fract(uTime * 0.06) * 7.6;
  float scan = smoothstep(0.32, 0.0, abs(aTarget.y - scanY)) * step(0.98, p) * (1.0 - s);
  vec3 col = mix(aColor.rgb, vec3(0.38, 1.0, 0.494), scan * 0.7);

  vColor = vec4(col, aColor.a * (0.08 + 0.92 * p) * (1.0 - s * 0.85));
  vec4 mv = uModel * vec4(pos, 1.0);
  mv.z -= ${CAMERA_Z.toFixed(1)};
  gl_PointSize = aSize * uDpr * uScale * (30.0 / -mv.z) * (1.0 + scan * 0.6 + f * 0.8);
  gl_Position = uProj * mv;
}`;

const FRAG = `
precision mediump float;
varying vec4 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.12, d);
  gl_FragColor = vec4(vColor.rgb, vColor.a * a);
}`;

function perspective(fovDeg, aspect, near, far) {
  const f = 1 / Math.tan((fovDeg * Math.PI) / 360);
  const nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}
function rotation(rx, ry) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
  // R = Rx * Ry, column-major
  return new Float32Array([cy, sx * sy, -cx * sy, 0, 0, cx, sx, 0, sy, -sx * cy, cx * cy, 0, 0, 0, 0, 1]);
}

function sample(img) {
  const w = SAMPLE_W;
  const h = Math.round((img.naturalHeight / img.naturalWidth) * w);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const scale = WORLD_H / h;
  const out = { target: [], start: [], color: [], size: [], rand: [] };

  // Two particles per pixel in dense areas keeps edges crisp without a huge grid.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3] / 255;
      if (a < 0.5) continue;
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const eye = r > 0.6 && g > 0.25 && g < 0.72 && b < 0.32;
      const dark = lum < 0.3 && !eye;
      const copies = dark ? 1 : 2;
      for (let k = 0; k < copies; k++) {
        const jx = (Math.random() - 0.5) * 0.9, jy = (Math.random() - 0.5) * 0.9;
        out.target.push((x + jx - w / 2) * scale, (h / 2 - y - jy) * scale, (lum - 0.5) * 0.9 + (Math.random() - 0.5) * 0.15);
        const rad = 8 + Math.random() * 5, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        out.start.push(rad * Math.sin(ph) * Math.cos(th), rad * Math.sin(ph) * Math.sin(th), rad * Math.cos(ph) - 4);
        if (eye) out.color.push(1.0, 0.56, 0.12, 1);
        else if (dark) out.color.push(0.42, 0.44, 0.47, 0.85); // antlers and outline: smoky charcoal
        else out.color.push(r * 0.96, g * 0.96, b * 0.98, 0.95);
        out.size.push(eye ? 3.4 : dark ? 1.35 : 1.0 + lum * 0.9);
        out.rand.push(Math.random());
      }
    }
  }
  return out;
}

export function mountStag(host) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    console.warn('Stag particles disabled:', err.message);
    return;
  }
  gl.useProgram(prog);
  const U = (n) => gl.getUniformLocation(prog, n);
  const u = {
    proj: U('uProj'), model: U('uModel'), progress: U('uProgress'), scatter: U('uScatter'), time: U('uTime'),
    dpr: U('uDpr'), scale: U('uScale'), mouse: U('uMouse'), mouseOn: U('uMouseOn'),
  };

  const img = new Image();
  img.src = SRC;
  img.decode().then(() => {
    const s = sample(img);
    const attr = (name, arr, size) => {
      const loc = gl.getAttribLocation(prog, name);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attr('aTarget', s.target, 3);
    attr('aStart', s.start, 3);
    attr('aColor', s.color, 4);
    attr('aSize', s.size, 1);
    attr('aRand', s.rand, 1);
    const count = s.rand.length;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    let aspect = 1, viewH = 1;
    const resize = () => {
      const r = host.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      aspect = r.width / r.height;
      viewH = r.height;
      gl.uniformMatrix4fv(u.proj, false, perspective(34, aspect, 0.1, 60));
      // keep the stag a sensible size on tall phones and wide monitors alike
      gl.uniform1f(u.scale, Math.max(0.7, Math.min(1.5, viewH / 820)));
    };
    gl.uniform1f(u.dpr, dpr);
    resize();
    new ResizeObserver(resize).observe(host);

    // pointer → world coordinates on the stag's plane
    const pointer = { x: 0, y: 0, wx: 99, wy: 99, on: 0, target: 0 };
    const halfH = Math.tan((34 * Math.PI) / 360) * CAMERA_Z;
    const onMove = (e) => {
      const r = host.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      pointer.x = nx; pointer.y = ny;
      pointer.wx = nx * halfH * aspect;
      pointer.wy = -ny * halfH;
      pointer.target = 1;
    };
    if (!reduced) {
      addEventListener('pointermove', onMove, { passive: true });
      host.addEventListener('pointerleave', () => { pointer.target = 0; });
    }

    host.appendChild(canvas);
    host.classList.add('is-live');

    let visible = true, raf = 0, t0 = performance.now(), rx = 0, ry = 0;
    const frame = () => {
      const t = (performance.now() - t0) / 1000;
      const scatter = reduced ? 0 : Math.min(1, Math.max(0, scrollY / (viewH * 0.9)));
      pointer.on += (pointer.target - pointer.on) * 0.08;
      if (!reduced) {
        ry += (pointer.x * 0.28 - ry) * 0.05;
        rx += (pointer.y * 0.16 - rx) * 0.05;
      }
      gl.uniformMatrix4fv(u.model, false, rotation(rx, ry));
      gl.uniform1f(u.progress, reduced ? 1 : Math.min(1, t / 2.8));
      gl.uniform1f(u.time, reduced ? 0 : t);
      gl.uniform1f(u.scatter, scatter);
      gl.uniform2f(u.mouse, pointer.wx, pointer.wy);
      gl.uniform1f(u.mouseOn, pointer.on);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, count);
      if (!reduced && visible) raf = requestAnimationFrame(frame);
    };
    new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was && !reduced) raf = requestAnimationFrame(frame);
      if (!visible) cancelAnimationFrame(raf);
    }).observe(host);
    frame();
    if (reduced) addEventListener('resize', () => requestAnimationFrame(frame));
  }).catch(() => { /* keep the static logo */ });
}

const host = document.querySelector('[data-stag]');
if (host) mountStag(host);
