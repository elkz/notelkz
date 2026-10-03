// Read-only JSON API for the website. Responses come from an in-memory cache filled
// by the background jobs, so visitors never trigger calls to Twitch.
import http from 'node:http';

const routes = {
  '/api/status': { key: 'status', maxAge: 30 },
  '/api/schedule': { key: 'schedule', maxAge: 120 },
  '/api/clips': { key: 'clips', maxAge: 300 },
  '/api/videos': { key: 'videos', maxAge: 300 },
  '/api/music': { key: 'music', maxAge: 20 },
};

export function createServer(cache, health) {
  return http.createServer((req, res) => {
    const send = (status, body, maxAge = 0) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': maxAge ? `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}` : 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify(body));
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return send(405, { error: 'Method not allowed' });
    }
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/api/health') return send(200, health());

    const route = routes[pathname.replace(/\/$/, '')];
    if (!route) return send(404, { error: 'Not found' });
    const data = cache[route.key];
    if (!data) return send(503, { error: 'Data not loaded yet' });
    return send(200, data, route.maxAge);
  });
}
