const assert=require('assert');
const fs=require('fs');

const html=fs.readFileSync('index.html','utf8');
const fontUrl='https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap';
const escapedFontUrl=fontUrl.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

assert.strictEqual(
  (html.match(new RegExp(escapedFontUrl,'g'))||[]).length,
  1,
  'Noto Sans TC stylesheet is declared exactly once'
);
assert.match(html,/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/);
assert.match(html,/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/);
assert.match(
  html,
  /--font-ui:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif/,
  'the shared UI stack has the approved Traditional Chinese fallback order'
);
assert.match(html,/body\{[\s\S]*?font-family:var\(--font-ui\)/,'body consumes the shared UI font variable');
assert.doesNotMatch(html,/font-family:[^;}]*"Hiragino Sans"/,'the Japanese Hiragino stack is not restored');
assert.doesNotMatch(html,/font-family:[^;}]*"Noto Sans JP"/,'Noto Sans JP is not used for Traditional Chinese');
assert.doesNotMatch(html,/font-family:[^;}]*"Yu Gothic"/,'Yu Gothic is not used for Traditional Chinese');
assert.doesNotMatch(fontUrl,/100|200|300|600|800|900/,'the request does not load unapproved weights');
assert.match(html,/input,select,textarea\{font-size:16px\}/,'the base iOS focus-zoom guard remains');

console.log('UI font tests passed');
