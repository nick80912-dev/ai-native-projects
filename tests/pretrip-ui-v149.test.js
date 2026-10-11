/* tests/pretrip-ui-v149.test.js — v149 出發前小改版(Bar 2026-10-11 核准)
   1. 出發前首頁:拿掉「今天沒有排定行程」,改列第一站的日期、時間與內容;D-N 倒數不變。
   2. 交通標籤:依方式給圖示與固定顏色;10/18 的航班不再顯示成 🚗。
   字型(Huninn)的契約在 tests/ui-font.test.js。 */
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {readIndexHtml,extractFunction}=require('./support/source');
const {swVersion}=require('./support/version');

const html=readIndexHtml();
function load(names,extra){
  const sandbox=Object.assign({String,escapeHtml:v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')},extra||{});
  vm.createContext(sandbox);
  vm.runInContext(names.map(n=>extractFunction(html,n)).join('\n'),sandbox);
  return sandbox;
}

/* ---- 交通方式 ---- */
let mode='drive';
const t=load(['transportModeOf'],{transport:()=>mode});
const key=text=>t.transportModeOf(text).key;
assert.strictEqual(key('9:00開櫃\n11:30(TPE台灣桃園)-15:05(OKJ日本岡山)'),'flight','the 10/18 flight is a plane, not a car');
assert.strictEqual(t.transportModeOf('9:00開櫃 11:30(TPE台灣桃園)').icon,'✈️');
assert.strictEqual(key('開車6分鐘'),'drive');
assert.strictEqual(key('開車約2小時'),'drive');
assert.strictEqual(key('步行7分鐘'),'walk');
assert.strictEqual(key('航程10分鐘'),'ferry');
assert.strictEqual(key('接駁車2-10分鐘'),'transit');
assert.strictEqual(key('入境後大廳走路5分鐘找到服務台，有提供免費接送服務，接駁車2-10分鐘'),'walk','mixed text keeps the v148 walking icon');
assert.strictEqual(key('沿著尾道本通商店街步行10分鐘，纜車時間3分鐘'),'walk');
assert.strictEqual(key('15分鐘'),'drive','a self-drive trip still defaults to the car');
mode='transit';
assert.strictEqual(key('15分鐘'),'other','other trips fall back to a neutral chip');
mode='drive';

/* 真實岡山資料:每一種交通說明都有歸類,只有 P000 的航班被判成飛機 */
(function(){
  const sandbox={};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','shell',swVersion(),'builtin-snapshot.js'),'utf8'),sandbox);
  const csv=sandbox.BUILTIN.places;
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<csv.length;i++){const ch=csv[i];
    if(quoted){if(ch==='"'){if(csv[i+1]==='"'){field+='"';i++;}else quoted=false;}else field+=ch;}
    else if(ch==='"')quoted=true;else if(ch===','){row.push(field);field='';}
    else if(ch==='\n'){row.push(field);rows.push(row);row=[];field='';}else if(ch!=='\r')field+=ch;}
  const header=rows[0],col=header.indexOf('交通時間');
  assert(col>=0,'Places has 交通時間');
  const travel=rows.slice(1).map(r=>[r[0],(r[col]||'').trim()]).filter(r=>r[1]);
  assert(travel.length>=20,'enough real samples');
  const flights=travel.filter(r=>key(r[1])==='flight').map(r=>r[0]);
  assert.deepStrictEqual(flights,['P000'],'only the departure flight is a plane');
  travel.forEach(r=>assert.notStrictEqual(key(r[1]),'other',r[0]+' has a transport mode'));
})();

/* 渲染:標籤帶 mode class;顏色是 :root 的固定 token,深色字在每個底色上 ≥ 4.5:1 */
assert(html.includes("var mode=transportModeOf(drive),driveIcon=mode.icon;"));
assert(html.includes(`'<span class="drive-chip mode-'+mode.key+'">'+driveIcon+' '+escapeHtml(drive)+'</span>'`));
const tokens={};
html.replace(/--mode-([a-z]+)(?:-bg)?:(#[0-9a-f]{6})/g,(m,name,hex)=>{tokens[m.split(':')[0]]=hex;return m;});
function lum(hex){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4));return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];}
function ratio(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
['drive','walk','ferry','flight','transit'].forEach(function(name){
  const bg=tokens['--mode-'+name+'-bg'];
  assert(bg,'token for '+name);
  assert(ratio(tokens['--mode-ink'],bg)>=4.5,name+' chip text passes AA ('+ratio(tokens['--mode-ink'],bg).toFixed(2)+')');
  assert(html.includes('.drive-chip.mode-'+name+'{background:var(--mode-'+name+'-bg);color:var(--mode-ink)}'),name+' chip uses the tokens');
});

/* ---- 出發前首頁 ---- */
const h=load(['renderPreTripFirstStop']);
assert.strictEqual(h.renderPreTripFirstStop([{date:'10/18',dow:'日',items:[{time:'9:00',act:'機場check in',place:'桃園機場'}]}]),
  '<div class="pretrip-first-stop">第一站：10/18（日） 9:00 機場check in</div>');
assert.strictEqual(h.renderPreTripFirstStop([{date:'10/18',dow:'',items:[{time:'',act:'',place:'<岡山>'}]}]),
  '<div class="pretrip-first-stop">第一站：10/18 &lt;岡山&gt;</div>','falls back to the place, escaped');
assert.strictEqual(h.renderPreTripFirstStop([]),'');
assert.strictEqual(h.renderPreTripFirstStop([{date:'10/18',items:[]}]),'');
const renderToday=extractFunction(html,'renderToday');
assert.doesNotMatch(renderToday,/今天沒有排定行程/,'the pre-trip hero no longer says there is nothing today');
assert.match(renderToday,/<div class="date">還沒到出發日<\/div>'\+renderPreTripCountdown\(\)\+'<\/div>'\+\s*renderPreTripFirstStop\(days\)\+/,'the D-N countdown stays; the first stop follows the title');

console.log('pre-trip UI v149 tests passed');
