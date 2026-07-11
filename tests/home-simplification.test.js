const assert = require('assert');
const fs = require('fs');
const path = require('path');

for (const file of ['index.html']) {
  const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  assert.match(html, /--tabbar-height:58px/, `${file} has a stable tabbar height`);
  assert.match(html, /height:calc\(var\(--tabbar-height\) \+ env\(safe-area-inset-bottom\)\)/, `${file} locks tabbar height`);
  assert.match(html, /var timePick=item\?pickNextStop\(\[item\]/, `${file} reuses next-stop timing when a check is cancelled`);
  assert.match(html, /已取消,該行程時間已過,列於已略過/, `${file} explains past-time cancellation`);
  const clusterStop = html.slice(html.indexOf('function renderClusterStop'), html.indexOf('function renderClusterNextStopCard'));
  assert.doesNotMatch(clusterStop, /qa-btn|pn_pk_|pn_nf_/, `${file} keeps cluster child stops action-free on home`);
  assert.match(html, /想逛<small>/, `${file} preserves the shop wishlist`);
  assert.match(html, /\.nx-decision-btn\{[^}]*font-size:12px/, `${file} uses compact home decision buttons`);
}

console.log('home simplification tests passed');
