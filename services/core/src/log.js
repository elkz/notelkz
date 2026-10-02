const write = (level, args) => {
  const line = `${new Date().toISOString()} ${level.padEnd(5)} ${args.map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`;
  (level === 'error' || level === 'warn' ? console.error : console.log)(line);
};
export const log = {
  info: (...a) => write('info', a),
  warn: (...a) => write('warn', a),
  error: (...a) => write('error', a),
};
