// Runs a Vercel-style "static files + /api/*.js functions" project on plain Node. Handlers keep the (req, res) signature with req.query / req.body
// and res.status() / res.json() / res.send(); vercel.json "headers" are applied to every response.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = '/app';   // the Dockerfile copies the repo here
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.woff2': 'font/woff2' };
let extra = {};
try { const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')); for (const h of v.headers || []) for (const x of h.headers || []) extra[x.key] = x.value; } catch {}
const cache = new Map();
async function handler(name) {
  for (const ext of ['.js', '.mjs', '.cjs']) { const f = path.join(ROOT, 'api', name + ext); if (fs.existsSync(f)) { if (!cache.has(f)) cache.set(f, import(pathToFileURL(f).href)); const m = await cache.get(f); return m.default || m.handler; } }
  return null;
}
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x'); const p = decodeURIComponent(url.pathname);
    for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
    if (p.startsWith('/api/')) {
      let fn = null; try { fn = await handler(p.slice(5).replace(/[^a-zA-Z0-9_\-/]/g, '')); } catch (e) { console.error(e); res.statusCode = 500; return res.end('Function failed to load'); }
      if (!fn) { res.statusCode = 404; return res.end('Not found'); }
      const chunks = []; for await (const c of req) chunks.push(c); const raw = Buffer.concat(chunks).toString();
      req.query = Object.fromEntries(url.searchParams); req.body = raw; if ((req.headers['content-type'] || '').includes('json')) { try { req.body = JSON.parse(raw); } catch {} }
      res.status = (c) => { res.statusCode = c; return res; };
      res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
      res.send = (b) => { res.end(typeof b === 'object' && !Buffer.isBuffer(b) ? JSON.stringify(b) : b); return res; };
      res.redirect = (c, l) => { res.statusCode = typeof c === 'number' ? c : 307; res.setHeader('Location', l || c); res.end(); };
      try { return await fn(req, res); } catch (e) { console.error(e); if (!res.headersSent) { res.statusCode = 500; res.end('Function error'); } return; }
    }
    let f = path.normalize(path.join(ROOT, p === '/' ? 'index.html' : p));
    if (!f.startsWith(ROOT) || f.includes('/api/') || f.includes('node_modules') || path.basename(f).startsWith('.')) { res.statusCode = 404; return res.end('Not found'); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) f = path.join(ROOT, 'index.html');
    if (!fs.existsSync(f)) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', MIME[path.extname(f).toLowerCase()] || 'application/octet-stream'); fs.createReadStream(f).on('error', () => res.end()).pipe(res);
  } catch (e) { console.error(e); res.statusCode = 500; res.end('Server error'); }
}).listen(3000, '0.0.0.0', () => console.log('vercel-fn server on 3000'));
