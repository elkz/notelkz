// Minimal frontmatter parser for the content files.
// Supports `key: value` lines where value is a string, number, true/false,
// empty (null) or an inline list like `[React, Node.js]`.
// Deliberately small: anything richer belongs in a JSON file.

function parseValue(v) {
  v = v.trim();
  if (v === '') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v.startsWith('[') && v.endsWith(']')) {
    return v.slice(1, -1).split(',').map((s) => parseValue(s)).filter((s) => s !== null);
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

export function parseFrontmatter(source, file = 'content') {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { data: {}, body: source };
  const data = {};
  match[1].split(/\r?\n/).forEach((line, i) => {
    if (!line.trim() || line.trim().startsWith('#')) return;
    const idx = line.indexOf(':');
    if (idx === -1) throw new Error(`${file}: frontmatter line ${i + 2} needs "key: value" — got "${line}"`);
    data[line.slice(0, idx).trim()] = parseValue(line.slice(idx + 1));
  });
  return { data, body: source.slice(match[0].length) };
}
