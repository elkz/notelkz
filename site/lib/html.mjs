// Tiny, safe HTML templating.
// Every interpolated value is escaped unless it was itself produced by `html` (or `raw`).
// Arrays are flattened, and null/undefined/false render as nothing.

class Safe {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

function render(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof Safe) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return esc(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return new Safe(out);
}

/** Mark trusted markup (e.g. rendered Markdown from our own content files) as safe. */
export const raw = (s) => new Safe(String(s ?? ''));

/** Join class names, skipping falsy entries. */
export const cx = (...parts) => parts.filter(Boolean).join(' ');
