const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { gunzipSync } = require('node:zlib');

const rejected = [
  "上下の閉じるボタン、Escキー、または背景のクリックで閉じられます。",
  "Close Help with either close button, Escape, or a click on the backdrop.",
  "ヘルプを開いている間は、背後のページはスクロールしません。長い説明はヘルプ内をスクロールして読めます。上下の閉じるボタン、Escキー、または背景のクリックで閉じると、通常のページスクロールに戻ります。",
  "The page behind Help stays still while Help is open. Scroll inside Help to read longer content. Close it with either close button, Escape, or a click on the backdrop to resume normal page scrolling."
];

test('help contains user guidance rather than implementation or layout audit prose', () => {
  const root = path.join(__dirname, '..');
  const files = ['src/index.template.html', 'dist/index.html', 'dist/index.self-extract.html',
    ...fs.readdirSync(root).filter(name => name.endsWith('.html'))];
  for (const file of files) {
    const filename = path.join(root, file);
    if (!fs.existsSync(filename)) continue;
    let html = fs.readFileSync(filename, 'utf8');
    const payload = html.match(/<script id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/);
    if (payload) html = gunzipSync(Buffer.from(payload[1].replace(/\s/g, ''), 'base64')).toString('utf8');
    for (const copy of rejected) assert.ok(!html.includes(copy), `${file}: remove internal-facing help copy: ${copy}`);
    const help=html.match(/<!-- APP:HELP:BEGIN -->([\s\S]*?)<!-- APP:HELP:END -->/);
    assert.ok(help, `${file}: inline Help content is present`);
    for(const [lang,maxLength,required] of [
      ['ja',330,['200ページ','PDFに保存','外部に送信しません','余白0 mm']],
      ['en',640,['200 pages','Save as PDF','not sent to a server','0 mm margins']]
    ]){
      const match=help[1].match(new RegExp('<div data-help-lang="'+lang+'"[^>]*>([\\s\\S]*?)<\\/div>'));
      assert.ok(match,`${file}: ${lang} help present`);
      const copy=match[1].replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
      assert.ok(copy.length<=maxLength,`${file}: ${lang} Help is concise (${copy.length} characters)`);
      assert.equal((match[1].match(/<li>/g)||[]).length,3,`${file}: ${lang} has only three setup steps`);
      for(const phrase of required)assert.ok(copy.includes(phrase),`${file}: ${lang} preserves ${phrase}`);
    }
  }
});
