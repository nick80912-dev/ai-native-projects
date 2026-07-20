const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const html=fs.readFileSync('index.html','utf8');

function extract(startText,endText){
  const start=html.indexOf(startText),end=html.indexOf(endText,start);
  assert(start>=0&&end>start,startText+' source exists');
  return html.slice(start,end);
}

function plain(value){return JSON.parse(JSON.stringify(value));}

const source=extract('function ledgerLocalDateFromParts(','function openLedgerEntrySheet(');
const sandbox={
  appNow(){return new Date(2026,6,19,22,15);},
  timestampDate(value){return new Date(Number(value));},
  currentLedgerSettings(){return {exchangeRate:0.2,defaultCurrency:'JPY'};},
  registeredMembersForCurrentMode(){return [{name:'Bar'},{name:'Amy'}];},
  ledgerCategoryStore:{all(){return ['餐飲','交通','購物'];}},
  ledgerPayMethodStore:{all(){return ['現金','信用卡'];}},
  createLedgerDraftItem(draft,seed){return {key:'new-'+String(seed.name||''),name:String(seed.name||''),amount:String(seed.amount||''),category:seed.category,categoryManuallyAdjusted:!!seed.categoryManuallyAdjusted,taxExempt:false,isProxy:false,proxyTarget:''};},
  ledgerRecordMetadata(){return {inputCurrency:'JPY',couponAmount:0,priceMode:'included',taxRate:10,isTaxFree:false,isProxy:false,proxyTarget:''};},
  ledgerDetailWithoutTestPrefix(record){return record.detail;},
  normalizeLedgerCategoryName(value){return value;},
  ledgerVisibleNote(){return '';},parseParticipants(){return ['Bar'];},
  JSON,String,Number,Math,Date
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);

const draft=plain(sandbox.createLedgerEntryDraft('personal'));
const sharedDraft=plain(sandbox.createLedgerEntryDraft('shared'));
assert.deepStrictEqual(sharedDraft.participants,['Bar','Amy'],'new shared draft selects all registered members');
draft.multi=true;
draft.storeName='';
draft.categoryApply='餐飲';
draft.items=[
  {key:'blank',name:' ',amount:'',category:'餐飲',categoryManuallyAdjusted:false},
  {key:'partial',name:'拉麵',amount:'',category:'餐飲',categoryManuallyAdjusted:false},
  {key:'valid',name:'車票',amount:'500',category:'交通',categoryManuallyAdjusted:true}
];

assert.strictEqual(sandbox.ledgerItemIsCompletelyBlank(draft.items[0]),true,'fully blank rows are recognized');
assert.strictEqual(sandbox.ledgerItemIsCompletelyBlank(draft.items[1]),false,'partially entered rows are not blank');
assert.strictEqual(sandbox.ledgerValidItemCount(draft),1,'only fully valid rows count toward the save label');

let validation=plain(sandbox.validateLedgerEntryDraft(draft));
assert.strictEqual(validation.valid,false,'required store and partial rows block submission');
assert.strictEqual(validation.firstField,'storeName','store is the first multi-item validation error');
assert.strictEqual(validation.errors.storeName,'請輸入店家名稱');
assert.strictEqual(validation.errors.items.partial.amount,'請輸入有效金額');

draft.storeName='岡山拉麵';
validation=plain(sandbox.validateLedgerEntryDraft(draft));
assert.strictEqual(validation.valid,false,'a partial row still blocks after store is supplied');
assert.strictEqual(validation.firstItemKey,'partial');
assert.strictEqual(validation.firstItemField,'amount');

draft.items[1].amount='800';
validation=plain(sandbox.validateLedgerEntryDraft(draft));
assert.strictEqual(validation.valid,true);
assert.deepStrictEqual(validation.submissionItems.map(item=>item.key),['partial','valid'],'fully blank rows are excluded from submission');

const applyDraft={categoryApply:'餐飲',items:[
  {key:'a',category:'餐飲',categoryManuallyAdjusted:false},
  {key:'b',category:'交通',categoryManuallyAdjusted:true},
  {key:'c',category:'餐飲',categoryManuallyAdjusted:false}
]};
sandbox.updateLedgerCategoryApply(applyDraft,'購物');
assert.deepStrictEqual(plain(applyDraft.items.map(item=>item.category)),['購物','交通','購物'],'normal apply preserves manually adjusted rows');
sandbox.applyLedgerCategoryToAll(applyDraft,'餐飲');
assert.deepStrictEqual(plain(applyDraft.items.map(item=>item.category)),['餐飲','餐飲','餐飲'],'apply-all overwrites every row');
assert(applyDraft.items.every(item=>item.categoryManuallyAdjusted===false),'apply-all establishes the new inherited default');

const reset=plain(sandbox.resetLedgerDraftAfterSave({
  track:'shared',currency:'TWD',multi:true,payMethod:'信用卡',category:'交通',categoryApply:'購物',
  occurredDate:'2026/07/20',occurredTime:'22:15',storeName:'百貨公司',participants:['Bar','Amy'],
  items:[{key:'x',name:'外套',amount:'3000',category:'衣物',taxExempt:true,isProxy:true,proxyTarget:'Amy'}],
  priceMode:'excluded',taxPreset:'8',customTaxRate:'',discount:'100',note:'折扣'
}));
assert.strictEqual(reset.multi,true);
assert.strictEqual(reset.currency,'TWD');
assert.strictEqual(reset.payMethod,'信用卡');
assert.strictEqual(reset.categoryApply,'購物');
assert.strictEqual(reset.occurredDate,'2026/07/20');
assert.strictEqual(reset.occurredTime,'22:15');
assert.strictEqual(reset.storeName,'百貨公司');
assert.deepStrictEqual(reset.participants,['Bar','Amy']);
assert.strictEqual(reset.items.length,1);
assert.strictEqual(reset.items[0].name,'');
assert.strictEqual(reset.items[0].amount,'');
assert.strictEqual(reset.items[0].category,'購物');
assert.strictEqual(reset.items[0].taxExempt,false);
assert.strictEqual(reset.items[0].isProxy,false);
assert.strictEqual(reset.items[0].proxyTarget,'');
assert.strictEqual(reset.discount,'');
assert.strictEqual(reset.note,'');

const edited=plain(sandbox.ledgerDraftFromRecords([
  {id:'a',time:'2026-07-19T10:00:00+08:00',detail:'早餐',category:'餐飲',payMethod:'現金',storeName:'店',amountJpy:100,amountTwd:20},
  {id:'b',time:'2026-07-19T10:00:00+08:00',detail:'車票',category:'交通',payMethod:'現金',storeName:'店',amountJpy:200,amountTwd:40}
],'shared'));
assert.strictEqual(edited.categoryApply,'餐飲','editing uses the first item category as the apply value');
assert(edited.items.every(item=>item.categoryManuallyAdjusted===true),'existing edited rows are protected from normal apply changes');

assert(/\.ledger-datetime-grid\{[^}]*grid-template-columns:minmax\(0,1fr\)[^}]*gap:9px[^}]*width:100%/.test(html),'date and time use the approved stacked grid in every form mode');
assert(/\.ledger-datetime-grid \.ledger-sheet-field\{[^}]*margin-top:0/.test(html),'stacked date and time fields avoid duplicate vertical margins');
assert(/\.ledger-datetime-grid\{[^}]*grid-template-columns:minmax\(0,1fr\)[^}]*min-width:0[^}]*max-width:100%[^}]*box-sizing:border-box/.test(html),'date and time grid is constrained to the shared content box');
assert(/\.ledger-datetime-grid \.ledger-sheet-field\{[^}]*width:100%[^}]*min-width:0[^}]*max-width:100%[^}]*box-sizing:border-box/.test(html),'both stacked field wrappers use the same bounded width');
assert(/\.ledger-datetime-grid \.ledger-sheet-input\{[^}]*width:100%[^}]*min-width:0[^}]*max-width:100%[^}]*box-sizing:border-box/.test(html),'date and time inputs cannot exceed their field wrappers');
assert(html.includes('<div class="ledger-time-input-wrap"><input class="ledger-sheet-input" id="ledgerOccurredTime" type="time"'),'native time input has a dedicated sizing wrapper');
assert(/\.ledger-time-input-wrap\{[^}]*display:flex[^}]*width:100%[^}]*min-width:0[^}]*max-width:100%[^}]*box-sizing:border-box/.test(html),'time wrapper owns the full content width');
assert(/\.ledger-datetime-grid \.ledger-time-input-wrap input\[type="time"\]\{[^}]*flex:1 1 0[^}]*width:0[^}]*min-width:0[^}]*max-width:100%[^}]*box-sizing:border-box/.test(html),'iOS native time input grows from a zero flex basis instead of overflowing with width 100%');
assert(/\.ledger-calendar-popover\{[^}]*width:min\(316px,calc\(100vw - 48px\)\)[^}]*max-width:100%/.test(html),'date grid inset leaves the custom calendar popover sizing unchanged');
assert(html.includes('class="ledger-calendar-trigger"')&&html.includes('<svg aria-hidden="true"'),'stacked date field retains the existing calendar line SVG');
assert(/\.ledger-item-primary-row\{[^}]*grid-template-columns:32px minmax\(0,1fr\) minmax\(112px,120px\) 36px/.test(html),'multi-item rows use the approved compact four-column layout');
assert(html.includes('請輸入店家名稱'),'inline store validation copy is present');
assert(html.includes('確認儲存（')&&html.includes('筆）'),'multi-item primary action displays the valid record count');
assert(html.includes('>預設類別<'),'multi-item bill card exposes the renamed default category control');
assert(html.includes('新品項自動帶入，可逐筆調整'),'multi-item bill card explains default inheritance without adding state');
assert(html.includes('ledger-single-basic-info'),'single-entry essentials share one white information card');
assert(/\.ledger-item-proxy\{[^}]*background:/.test(html),'proxy details use a contained low-saturation panel');
assert(html.includes('ledger-item-flag-check'),'multi-item proxy uses the refined compact checked control');
assert(html.includes('ledger-proxy-switch')&&html.includes('ledger-proxy-switch-track'),'single-item proxy uses the approved text row and switch');
const proxyTrackSource=extract('function renderLedgerTrackSpecificFields(','function renderLedgerTaxDisclosure(');
assert(!proxyTrackSource.includes('ledger-sheet-label">代購'),'single-item proxy does not add a redundant heading above the grouped row');
const proxySwitchCss=(html.match(/\.ledger-sheet-field>label\.ledger-proxy-switch\{([^}]*)\}/)||[])[1]||'';
assert(proxySwitchCss.includes('display:flex')&&proxySwitchCss.includes('justify-content:space-between')&&proxySwitchCss.includes('background:#f4e9e6')&&proxySwitchCss.includes('border:1px solid #c99c94')&&proxySwitchCss.includes('border-radius:9px'),'single-item proxy uses the approved pale warm-red grouped row with the toggle on the right');
assert(html.includes('ledger-proxy-heading'),'proxy title and helper copy share one compact heading row');
assert(/\.ledger-proxy-help\{[^}]*font-size:9px/.test(html),'proxy helper copy is reduced by one size');
assert(/\.ledger-item-proxy \.ledger-sheet-choice\{[^}]*min-height:28px[^}]*border-radius:7px[^}]*font-size:10px/.test(html),'proxy target choices use the refined compact size');
assert(/\.ledger-item-proxy \.ledger-sheet-choice-grid\{[^}]*align-items:center/.test(html),'proxy target choices are vertically centered');
assert(/\.ledger-proxy-add-row\{[^}]*grid-template-columns:minmax\(0,1fr\) 30px[^}]*gap:5px[^}]*margin-top:6px/.test(html)&&/\.ledger-proxy-add-row\{[^}]*flex:1 0 100%[^}]*width:100%/.test(html),'proxy add-target input and plus button move to their own full-width row');
assert(/\.ledger-proxy-add-row \.ledger-sheet-input\{[^}]*min-height:30px/.test(html),'proxy add-target input is reduced to 30px');
assert(/\.ledger-proxy-add-row button\{[^}]*min-height:30px[^}]*border-radius:7px[^}]*font-size:14px/.test(html),'proxy add button is reduced to a 30px rounded rectangle');
assert(html.includes('function renderLedgerParticipantGroup('),'bill and item participant controls share one renderer');
assert(html.includes('ledger-participant-group')&&html.includes('ledger-participant-choice'),'shared participant controls use scoped group classes');
assert(/\.ledger-participant-group\{[^}]*padding:7px[^}]*border-radius:9px/.test(html),'participant group matches the compact proxy container geometry');
assert(/\.ledger-participant-choice\{[^}]*min-height:28px[^}]*border-radius:7px[^}]*font-size:10px/.test(html),'participant choices match the compact proxy choice size');

console.log('ledger form 2.2.3 tests passed');
