const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const html=fs.readFileSync('shell/v111/index.html','utf8');

function extractFunction(source,name){
  const start=source.indexOf('function '+name+'(');assert(start>=0,name+' exists');
  let cursor=source.indexOf('{',start),depth=0;
  for(;cursor<source.length;cursor++){if(source[cursor]==='{')depth++;if(source[cursor]==='}')depth--;if(depth===0)return source.slice(start,cursor+1);}
  throw new Error('could not extract '+name);
}

const recentStart=html.indexOf('function renderLedgerRecentRecord(');
const recentEnd=html.indexOf('function renderLedgerRecentGroups(',recentStart);
const detailStart=html.indexOf('function ledgerRecordDetailRows(');
const detailEnd=html.indexOf('function closeLedgerRecordDetail(',detailStart);
assert(recentStart>=0&&recentEnd>recentStart,'recent-record renderer exists');
assert(detailStart>=0&&detailEnd>detailStart,'detail-row renderer exists');
const recent=html.slice(recentStart,recentEnd),detail=html.slice(detailStart,detailEnd);

assert(recent.includes('record.storeName'),'recent rows show store name when it exists');
assert(recent.includes("renderProxyTargetMarkup(proxyTargetModel,'ledger-proxy-target-summary ledger-recent-context')"),'personal proxy records use the shared target renderer inside the compact context seam');
assert(recent.includes('ledger-recent-primary-line'),'the proxy target sits in the strict first row with item and payment');
assert(!recent.includes("badges.push('<span class=\"ledger-recent-badge\">代購 "),'the old lower proxy badge is removed');
assert(/\.ledger-recent-line\{[^}]*white-space:nowrap[^}]*overflow:hidden/.test(html),'long recent-card content truncates instead of creating a third visual line');
assert(recent.includes('ledger-record-menu-button'),'each recent row has a separate ellipsis action button');
assert(recent.includes("ledgerUiState.selectionMode?'':'<button class=\"ledger-record-menu-button\""),'selection mode still omits the ellipsis DOM instead of hiding it visually');
assert(recent.includes('openLedgerRecordActions'),'ellipsis opens the record action menu');
assert(recent.includes('handleLedgerRecordCardClick'),'the card body routes normal clicks to record detail and selection clicks to selection');
assert(html.includes('function handleLedgerRecordCardClick(')&&html.includes('else openLedgerRecordDetail(id)'),'normal card clicks still open record detail');
assert(recent.includes('_correctionVersionCount'),'corrected cards expose their version count');
assert(html.includes('function openLedgerRecordActions(')&&html.includes("className='ledger-action-popover'"),'record actions use a dedicated anchored menu entry point');
assert(html.includes('editLedgerRecord('),'record menu retains editing');
assert(html.includes('deletePersonalLedgerRecord('),'personal record menu retains local deletion');
assert(html.includes('openSharedLedgerDelete('),'shared record menu retains tombstone deletion with reason');
assert(
  html.includes('function openLedgerCorrectionSheet(')&&
  html.includes('function saveLedgerCorrection(')&&
  html.includes('function renderLedgerCorrectionPreview('),
  'protected receipt actions open a dedicated guided correction workflow with a pre-submit preview'
);
const entrySheetSource=extractFunction(html,'renderLedgerEntrySheet');
assert(
  entrySheetSource.includes("correction&&!(correctionKind==='void'&&correction.preview)"),
  'a completed whole-receipt void preview omits the duplicate secondary void action'
);
assert(!entrySheetSource.includes('重新預覽作廢'),'the misleading duplicate void-preview label is removed');
assert(
  entrySheetSource.includes('整張收據作廢')&&entrySheetSource.includes('確認整張作廢'),
  'the void flow retains its distinct preview and final-confirmation labels'
);
assert(
  /function updateLedgerSaveCount\(\)\{[^}]*!ledgerUiState\.correction/.test(html),
  'multi-item input updates must not overwrite the correction preview/confirm button label'
);
const persistEditSource=extractFunction(html,'persistLedgerEditedRecords');
assert(
  /mergedLedgerRecords\(\)/.test(persistEditSource)&&/records:\s*freshRecords/.test(persistEditSource),
  'shared edit save re-reads merged events and passes them to the final protection guard'
);
assert(
  /ledgerCorrectionPreviewSignature\(correction,replacements,voidReceipt,source\)/.test(html),
  'final correction confirmation fingerprints the fresh merged event set and invalidates stale previews'
);
const correctionPreviewSource=extractFunction(html,'renderLedgerCorrectionPreview');
assert(correctionPreviewSource.includes('品項變更')&&correctionPreviewSource.includes('受影響成員'),'preview renders item-level changes and affected members');
assert(correctionPreviewSource.includes('更正已產生新的待結算餘額'),'preview explicitly warns when a settled group becomes non-zero');

const actionHost={current:null};
const fakeDocument={
  getElementById(id){return actionHost.current&&actionHost.current.id===id?actionHost.current:null;},
  createElement(){return {id:'',className:'',dataset:{},style:{},innerHTML:'',offsetWidth:118,offsetHeight:80,setAttribute(){},remove(){if(actionHost.current===this)actionHost.current=null;}};},
  body:{appendChild(node){actionHost.current=node;}}
};
const actionsSandbox={
  document:fakeDocument,window:{innerWidth:390,innerHeight:844},ledgerUiState:{track:'personal'},
  ledgerTrackRecords(){return [{id:'a'},{id:'b'}];},
  ledgerEditSelection(records,id){return records.filter(function(record){return record.id===id;});},
  mergedLedgerRecords(){return [{id:'a'},{id:'b'}];},
  ledgerRecordActionModel(records,id){return {records:records.filter(record=>record.id===id),receipt:null,canEdit:true,canDelete:true,canCorrect:false,message:''};},
  getCurrentMember(){return 'Bar';},
  toast(){},jsHtmlAttrString(value){return String(value);}
};
vm.createContext(actionsSandbox);
vm.runInContext(extractFunction(html,'closeLedgerRecordActions')+'\n'+extractFunction(html,'openLedgerRecordActions'),actionsSandbox);
const trigger={getBoundingClientRect(){return {left:300,right:344,top:100,bottom:144};}};
actionsSandbox.openLedgerRecordActions('a',{stopPropagation(){},currentTarget:trigger},false);
assert.strictEqual(actionHost.current.dataset.actionKey,'record:a','popover identifies its source record');
assert(actionHost.current.innerHTML.includes('編輯 ✏️')&&actionHost.current.innerHTML.includes('刪除 🗑️'),'popover appends the approved action icons');
actionsSandbox.openLedgerRecordActions('a',{stopPropagation(){},currentTarget:trigger},false);
assert.strictEqual(actionHost.current,null,'clicking the same ellipsis closes the popover');
actionsSandbox.openLedgerRecordActions('a',{stopPropagation(){},currentTarget:trigger},false);
actionsSandbox.openLedgerRecordActions('b',{stopPropagation(){},currentTarget:trigger},false);
assert.strictEqual(actionHost.current.dataset.actionKey,'record:b','clicking another ellipsis switches the popover');

actionsSandbox.closeLedgerRecordActions();
actionsSandbox.ledgerUiState.track='shared';
actionsSandbox.ledgerRecordActionModel=function(records,id){
  return {records:[{id,member:'Bar'}],receipt:{rootId:id,protected:true},canEdit:false,canDelete:false,canCorrect:true,message:''};
};
actionsSandbox.openLedgerRecordActions('a',{stopPropagation(){},currentTarget:trigger},false);
assert(actionHost.current.innerHTML.includes('更正收據'),'protected payer sees correction instead of edit/delete');
assert(!actionHost.current.innerHTML.includes('編輯 ✏️')&&!actionHost.current.innerHTML.includes('刪除 🗑️'),'protected menu contains no direct mutation action');
assert(/\.ledger-action-popover\{[^}]*width:104px[^}]*box-sizing:border-box[^}]*padding:4px/.test(html),'action popover uses the approved 104px border-box shell');
assert(/\.ledger-action-popover button\{[^}]*min-height:36px[^}]*font-size:12px/.test(html),'action rows use the compact approved size');

assert(!detail.includes("['紀錄 ID'"),'detail presentation removes record ID');
assert(!detail.includes("['批次 ID'"),'detail presentation removes batch ID');
assert(!detail.includes("['同步狀態'"),'detail presentation removes sync status');
assert(detail.includes('formatLedgerLocalOccurrence'),'detail uses a local-readable occurrence formatter');
assert(html.includes('function renderLedgerRecordDetail(')&&html.includes('openLedgerCorrectionHistorySheet'),'protected shared detail links to immutable correction history');

/* ---- backlog #10:受保護紀錄的文案(2026-07-30 Bar 裁定,只改顯示層)----
   tag 只負責快速辨識,完整原因移交明細頁。以下三組斷言分別鎖住:
   新文案存在、舊文案完全移除、原鎖帳行為一字未動。 */
assert(recent.includes('<span class="ledger-recent-badge">已鎖帳</span>'),'受保護的團體紀錄 badge 顯示「已鎖帳」');
assert(!html.includes('還款確認後保護'),'舊文案「還款確認後保護」已從整份 index.html 移除');

const recordDetailSource=extractFunction(html,'renderLedgerRecordDetail');
assert(
  recordDetailSource.includes('此筆消費已完成還款確認,目前已鎖帳,無法再編輯或刪除。'),
  '明細頁新增鎖帳原因說明句(這是新增,不是從 badge 搬移)'
);
assert(
  recordDetailSource.includes("track==='shared'&&record._correctionProtected?'<p class=\"ledger-detail-lock-note\">"),
  '說明句的出現條件與歷史按鈕相同,且只在團體軌的受保護紀錄顯示'
);
assert(
  recordDetailSource.indexOf('ledger-detail-lock-note')<recordDetailSource.indexOf('查看不可改寫歷史'),
  '說明句排在「查看不可改寫歷史」按鈕之前'
);
assert(/\.ledger-detail-lock-note\{[^}]*color:var\(--ink-faint\)/.test(html),'說明句採用既有的次要文字語意色,不新增主題色');

/* 原鎖帳行為不變:判定來源、編輯／刪除守門訊息與不可改寫歷史入口都不得被本項動到 */
const editGuard=extractFunction(html,'assertCanEditLedgerRecord');
const deleteGuard=extractFunction(html,'assertCanDeleteLedgerRecord');
assert(
  editGuard.includes('此收據已有還款確認，請使用「更正收據」保留歷史'),
  'assertCanEditLedgerRecord 的錯誤訊息屬行為契約,本項不得更動'
);
assert(
  deleteGuard.includes('此收據已有還款確認，請使用「更正收據」保留歷史'),
  'assertCanDeleteLedgerRecord 的錯誤訊息屬行為契約,本項不得更動'
);
assert(
  editGuard.includes('ledgerRecordCorrectionProtected(record,records)')&&deleteGuard.includes('ledgerRecordCorrectionProtected(record,records)'),
  '編輯／刪除仍以 ledgerRecordCorrectionProtected 判定,未改用 badge 的顯示條件'
);
assert(!recent.includes('assertCanEdit')&&!recent.includes('assertCanDelete'),'顯示層不得自行呼叫權限守門');
assert(html.includes('function renderLedgerCorrectionArchive('),'full shared history keeps voided and corrected receipt history reachable');
const correctionHistorySource=extractFunction(html,'renderLedgerCorrectionHistory');
assert(correctionHistorySource.includes('操作人：')&&correctionHistorySource.includes('參與：'),'history discloses actor and version item content');
assert(correctionHistorySource.includes('與前版差異')&&correctionHistorySource.includes('renderLedgerCorrectionChanges(entry.changes)'),'history discloses actual changes relative to the prior canonical version');
assert(html.includes('function formatLedgerLocalOccurrence('),'local occurrence formatting is shared');
assert(html.includes('尚無消費紀錄')&&html.includes('點右下角 ＋ 開始記帳'),'recent empty state explains the next action');

const splitSource=html.slice(html.indexOf('function renderSplit()'),html.indexOf('/* ================= 導覽 / 啟動'));
const copyIndex=splitSource.indexOf('個人帳留在本機；團體帳跨裝置同步。');
const recentIndex=splitSource.indexOf('renderLedgerRecentHeading');
assert(copyIndex>0&&copyIndex<recentIndex,'dual-track explanation remains in the summary before the recent heading renderer');

console.log('ledger list action tests passed');
