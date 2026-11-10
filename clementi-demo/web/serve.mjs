#!/usr/bin/env node
// Local preview of the built web copy (run build.cjs first). It serves out/ the way the host does
// and runs the same api/*.mjs handlers. Not for public use.
//   DEEPSEEK_API_KEY=... node clementi-demo/web/serve.mjs     real DeepSeek
//   node clementi-demo/web/serve.mjs --mock                   fake DeepSeek replies, no key needed
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'out');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png' };
const config = JSON.parse(fs.readFileSync(path.join(here, 'vercel.json'), 'utf8'));
const siteHeaders = Object.fromEntries(config.headers[0].headers.map(h => [h.key, h.value]));

if (process.argv.includes('--mock')) {
  const mock = http.createServer((req, res) => {
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      if (req.url === '/user/balance') return res.end(JSON.stringify({ is_available: true, balance_infos: [] }));
      const body = JSON.parse(raw || '{}');
      const user = body.messages?.find(m => m.role === 'user')?.content || '{}';
      let payload = {};
      try { payload = JSON.parse(user); } catch {}
      const en = payload.responseLanguage === 'English';
      const options = (payload.nextChoices || []).map(c => ({ tone: c.tone, text: en ? 'Mock follow-up' : '模拟的下一句' }));
      const content = JSON.stringify({ narration: en ? '[mock] The room is quiet.' : '【模拟】屋里很安静。', reply: en ? '[mock] Thanks for coming by.' : '【模拟】谢谢你来看我们。', needs: [], options });
      res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content } }] }));
    });
  }).listen(0, '127.0.0.1');
  await new Promise(r => mock.once('listening', r));
  process.env.DEEPSEEK_BASE_URL = 'http://127.0.0.1:' + mock.address().port;
  process.env.DEEPSEEK_API_KEY = 'mock';
}

const handlers = {};
for (const name of ['dialogue', 'ai-check', 'ai-status']) handlers['/api/' + name] = (await import(pathToFileURL(path.join(here, 'api', name + '.mjs')).href)).default;

http.createServer(async (req, res) => {
  // Local only: refuse other Host names so a web page cannot reach this server through DNS rebinding.
  if (!['localhost:' + port, '127.0.0.1:' + port, ...String(process.env.EXTRA_HOSTS || '').split(',').filter(Boolean)].includes(req.headers.host)) { res.writeHead(403); return res.end('Forbidden'); }
  const url = new URL(req.url, 'http://' + req.headers.host);
  for (const [k, v] of Object.entries(siteHeaders)) res.setHeader(k, v);
  const handler = handlers[url.pathname];
  if (handler) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const headers = new Headers(Object.entries(req.headers).filter(([, v]) => typeof v === 'string'));
    headers.set('x-real-ip', req.socket.remoteAddress || '');
    const request = new Request(url, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    const response = await handler.fetch(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    return res.end(Buffer.from(await response.arrayBuffer()));
  }
  const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^\/+/, '');
  const file = path.join(out, rel);
  if (!file.startsWith(out + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'public, max-age=0, must-revalidate' });
  fs.createReadStream(file).pipe(res);
}).listen(port, process.env.HOST || '127.0.0.1', () => console.log('http://localhost:' + port + (process.argv.includes('--mock') ? '  (mock DeepSeek)' : '')));
