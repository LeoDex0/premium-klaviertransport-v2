// Baut die minifizierten Dateien und trägt sie mit Prüfsumme in index.html ein.
// Bearbeitet werden immer assets/css/style.css und assets/js/main.js, danach: npm run build
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, s) => fs.writeFileSync(path.join(root, p), s);
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB';

const css = esbuild.transformSync(read('assets/css/style.css'), {
  loader: 'css', minify: true, target: ['chrome100', 'safari15', 'firefox100'], legalComments: 'none'
}).code;
const js = esbuild.transformSync(read('assets/js/main.js'), {
  loader: 'js', minify: true, target: 'es2015', legalComments: 'none'
}).code;
write('assets/css/style.min.css', css);
write('assets/js/main.min.js', js);

let html = read('index.html');
html = html
  .replace(/assets\/css\/style(\.min)?\.css\?v=[\w]+/, 'assets/css/style.min.css?v=' + hash(css))
  .replace(/assets\/js\/main(\.min)?\.js\?v=[\w]+/, 'assets/js/main.min.js?v=' + hash(js));
write('index.html', html);

console.log('style.min.css', kb(css), '· main.min.js', kb(js));
