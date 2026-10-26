#!/usr/bin/env node
/**
 * 정적 내보내기(out/)를 Cloudflare Workers Static Assets 와 같은 규칙으로 서빙한다.
 *
 *   node scripts/serve-static.mjs [dir] [port]
 *
 * Cloudflare 의 기본 html_handling 은 `/map` 요청에 `map.html` 을 돌려준다.
 * 파일을 그대로만 내보내는 서버로는 그 동작을 확인할 수 없어서, 검증용으로
 * 같은 규칙을 흉내 낸다 — 운영과 다른 경로를 보고 "된다" 고 말하지 않기 위해서다.
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = process.argv[2] ?? 'out';
const PORT = Number(process.argv[3] ?? 4000);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

/** 정확한 파일 → <경로>.html → <경로>/index.html 순으로 찾는다 */
function resolve(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const base = join(ROOT, clean);
  const candidates = [base, `${base}.html`, join(base, 'index.html')];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = resolve(url.pathname === '/' ? '/index.html' : url.pathname);

  if (!file) {
    const notFound = join(ROOT, '404.html');
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    if (existsSync(notFound)) return createReadStream(notFound).pipe(res);
    return res.end('404');
  }

  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`static ${ROOT} → http://localhost:${PORT}`));
