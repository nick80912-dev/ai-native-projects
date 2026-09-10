const assert=require('assert');
const fs=require('fs');

const html=fs.readFileSync('shell/v114/index.html','utf8');
assert.doesNotMatch(html,/fonts\.googleapis\.com/,'first paint does not wait for Google Fonts CSS');
assert.doesNotMatch(html,/fonts\.gstatic\.com/,'first paint has no remote font connection');
assert.match(
  html,
  /--font-ui:"PingFang TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif/,
  'the shared UI stack starts with locally available Traditional Chinese fonts'
);
assert.match(html,/body\{[\s\S]*?font-family:var\(--font-ui\)/,'body consumes the shared UI font variable');
assert.doesNotMatch(html,/font-family:[^;}]*"Hiragino Sans"/,'the Japanese Hiragino stack is not restored');
assert.doesNotMatch(html,/font-family:[^;}]*"Noto Sans JP"/,'Noto Sans JP is not used for Traditional Chinese');
assert.doesNotMatch(html,/font-family:[^;}]*"Yu Gothic"/,'Yu Gothic is not used for Traditional Chinese');
assert.match(html,/input,select,textarea\{font-size:16px\}/,'the base iOS focus-zoom guard remains');

console.log('UI font tests passed');
