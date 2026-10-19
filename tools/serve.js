// Lokale Vorschau wie beim echten Hosting: Brotli/Gzip und Cache-Header. Start: npm start
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.join(__dirname, '..');
const port = Number(process.env.PORT) || 8090;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};
const COMPRESS = /\.(html|css|js|json|svg|txt)$/;
const cache = new Map();

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(root, rel);
  if (!file.startsWith(root) || /[\\/](node_modules|tools|\.git)([\\/]|$)/.test(rel)) { res.writeHead(403).end(); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404).end('Not found'); return; }
    const ext = path.extname(file).toLowerCase();
    const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' };
    // HTML immer frisch, Dateien mit ?v= für immer, Bilder und Schriften 30 Tage
    headers['Cache-Control'] = ext === '.html' ? 'no-cache'
      : url.searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'public, max-age=2592000';
    const accept = req.headers['accept-encoding'] || '';
    const enc = COMPRESS.test(ext) ? (/\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : null) : null;
    const key = file + ':' + st.mtimeMs + ':' + enc;
    let body = cache.get(key);
    if (!body) {
      const raw = fs.readFileSync(file);
      body = enc === 'br' ? zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } })
        : enc === 'gzip' ? zlib.gzipSync(raw, { level: 9 }) : raw;
      cache.set(key, body);
    }
    if (enc) { headers['Content-Encoding'] = enc; headers['Vary'] = 'Accept-Encoding'; }
    headers['Content-Length'] = body.length;
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  });
}).listen(port, '127.0.0.1', () => console.log('Vorschau: http://127.0.0.1:' + port + '/'));
