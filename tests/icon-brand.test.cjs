// A stale favicon/header or any change to the supplied artwork fails this contract.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { gunzipSync } = require('node:zlib');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)=(["'])(.*?)\2/g)].map(m => [m[1], m[3]]));
const compact = svg => svg.replace(/>\s+</g, '><').trim();
const asset = read('assets/favicon.svg');
function favicon(html, label) {
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map(m => attrs(m[0])).filter(a => a.rel === 'icon');
  assert.equal(links.length, 1, label + ': exactly one favicon');
  const url = links[0].href;
  assert.match(url, /^data:image\/svg\+xml(?:;base64)?,/, label + ': embedded SVG');
  const data = url.slice(url.indexOf(',') + 1);
  return url.startsWith('data:image/svg+xml;base64,') ? Buffer.from(data, 'base64').toString('utf8') : decodeURIComponent(data);
}
function extractedHtml() {
  const loader = read('dist/index.self-extract.html');
  const payload = loader.match(/<script id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(payload, 'self-extract payload exists');
  return gunzipSync(Buffer.from(payload[1].replace(/\s/g, ''), 'base64')).toString('utf8');
}
test('asset preserves the supplied artwork with 64px canvas, rx16 and #16624f', () => {
  assert.equal(createHash('sha256').update(asset).digest('hex'), '24c12f8106753599085945f1e5abcf92193b21768eb2c374c5281dc658dc3779');
  assert.equal(attrs(asset.match(/<svg\b[^>]*>/)[0]).viewBox, '0 0 64 64');
  const background = attrs(asset.match(/<rect\b[^>]*>/)[0]);
  assert.equal(background.width, '64');
  assert.equal(background.height, '64');
  assert.equal(background.rx, '16');
  assert.equal(background.fill, '#16624f');
});
for (const file of ['src/index.template.html', 'dist/index.html', 'max-text-print.html', 'self-extract payload']) {
  test(file + ': favicon and full-size header match the supplied asset', () => {
    const html = file === 'self-extract payload' ? extractedHtml() : read(file);
    assert.equal(compact(favicon(html, file)), compact(asset), file + ': favicon asset parity');
    const header = html.match(/<div class="brandmark" aria-hidden="true">\s*(<svg\b[\s\S]*?<\/svg>)/);
    assert.ok(header, file + ': decorative header icon exists');
    assert.equal(compact(header[1]), compact(asset), file + ': header asset parity');
    const rules = [...html.matchAll(/\.brandmark\s*\{([^}]+)\}/g)].map(m => m[1]);
    assert.ok(rules.length, file + ': header container styles exist');
    for (const rule of rules.filter(r => /border-radius/.test(r))) assert.match(rule, /border-radius:\s*25%/);
    assert.match(rules[0], /background:\s*transparent/);
    const svgRules = [...html.matchAll(/\.brandmark\s+svg\s*\{([^}]+)\}/g)].map(m => m[1]);
    assert.ok(svgRules.length, file + ': full-size artwork styles exist');
    for (const rule of svgRules) {
      assert.match(rule, /width:\s*100%/);
      assert.match(rule, /height:\s*100%/);
    }
  });
}
test('self-extract loader inherits the supplied embedded favicon before startup', () => {
  assert.equal(compact(favicon(read('dist/index.self-extract.html'), 'loader')), compact(asset));
});
test('generated aliases and compressed payload restore the complete readable HTML', () => {
  assert.equal(read('max-text-print.html'), read('dist/index.html'));
  assert.equal(extractedHtml(), read('dist/index.html'));
});
