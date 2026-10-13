const assert=require('assert');
const impact=require('../diagnostic-impact.js');

const raw={category:'sync',level:'warn',message:'ledger 增量讀取失敗,維持 CSV 路徑:ledger 增量讀取逾時'};
const snapshot=JSON.parse(JSON.stringify(raw));
assert.deepStrictEqual(impact.project(raw),{
  severity:'degraded',
  title:'分帳快速同步暫時逾時',
  impact:'目前仍可使用',
  fallback:'已改用一般 CSV 同步',
  raw:raw.message
});
assert.deepStrictEqual(raw,snapshot,'projection never mutates the stored AppLog entry');

[
  'ledger 增量讀取失敗,維持 CSV 路徑:ledger 增量讀取逾時'
].forEach(function(message){
  assert.deepStrictEqual(impact.project({category:'sync',level:'warn',message:message}),{
    severity:'degraded',
    title:'分帳快速同步暫時逾時',
    impact:'目前仍可使用',
    fallback:'已改用一般 CSV 同步',
    raw:message
  },'the complete sync timeout wrapper recognizes the exact emitted form');
});

[
  'ledger 增量讀取失敗,維持 CSV 路徑:HTTP 403',
  'ledger 增量讀取失敗,維持 CSV 路徑:HTTP 500',
  'ledger 增量讀取失敗,維持 CSV 路徑:Failed to fetch',
  'ledger 增量讀取失敗,維持 CSV 路徑:NetworkError when attempting to fetch resource.',
  'ledger 增量讀取失敗,維持 CSV 路徑:ledger 增量讀取逾時 (重試中)',
  'ledger 增量讀取失敗,維持 CSV 路徑:ledger 增量讀取超時'
].forEach(function(message){
  assert.deepStrictEqual(impact.project({category:'sync',level:'warn',message:message}),{
    severity:'degraded',
    title:message,
    impact:'請查看原始紀錄',
    fallback:'',
    raw:message
  },'non-timeout and near-match sync failures retain conservative raw diagnostics');
});

assert.deepStrictEqual(impact.project({category:'repository',level:'warn',message:'ledger 增量讀取失敗,維持 CSV 路徑:ledger 增量讀取逾時'}),{
  severity:'degraded',
  title:'ledger 增量讀取失敗,維持 CSV 路徑:ledger 增量讀取逾時',
  impact:'請查看原始紀錄',
  fallback:'',
  raw:'ledger 增量讀取失敗,維持 CSV 路徑:ledger 增量讀取逾時'
},'timeout wording outside the sync category is not reclassified');

assert.deepStrictEqual(impact.project({level:'info',message:'背景同步完成'}),{
  severity:'info',
  title:'背景同步完成',
  impact:'目前使用不受影響',
  fallback:'',
  raw:'背景同步完成'
});

assert.deepStrictEqual(impact.project({level:'info',message:'本次變更可能未保存'}),{
  severity:'action-required',
  title:'本次變更可能未保存',
  impact:'請確認資料是否已保存',
  fallback:'',
  raw:'本次變更可能未保存'
},'action-required copy takes priority over the info level');

assert.deepStrictEqual(impact.project({level:'warn',message:'未知的同步警告'}),{
  severity:'degraded',
  title:'未知的同步警告',
  impact:'請查看原始紀錄',
  fallback:'',
  raw:'未知的同步警告'
});

/* v152：旅途中常見訊息的白話說明。只認確切寫法與分類。 */
[
  ['repository','分帳佇列屬於其他旅程（sheet:kyushu-2027），已暫停送出','action-required','待送的分帳屬於其他旅程，已暫停送出','這些紀錄不會送出，也不會刪除；請截圖給旅程負責人',''],
  ['repository','分帳送出失敗:Failed to fetch — 已留在本機佇列','degraded','分帳紀錄還沒送出','紀錄仍在這支手機','連上網路後會自動補送'],
  ['repository','背景同步失敗：Failed to fetch','degraded','分帳紀錄背景送出失敗','紀錄仍在這支手機','連上網路後會自動補送'],
  ['sync','ledger 下載失敗 — 沿用目前分帳快照,其餘工作表繼續更新','degraded','分帳紀錄這次沒有下載成功','分帳暫時顯示上次的資料','其他行程資料已更新'],
  ['sync','SW 註冊失敗:SecurityError','degraded','離線功能沒有啟用','沒有網路時可能打不開 App','連網重新開啟 App 會再試一次'],
  ['data','天氣讀取未完成；可於首頁重試。','degraded','天氣暫時讀不到','不影響行程與分帳','可於首頁重試'],
  ['data','天氣快取未能保存；目前資料僅在本次開啟期間可用。','degraded','天氣資料沒有存到手機','重新開啟 App 後要再讀一次天氣','']
].forEach(function([category,message,severity,title,impactText,fallback]){
  assert.deepStrictEqual(impact.project({category:category,level:'warn',message:message}),{severity:severity,title:title,impact:impactText,fallback:fallback,raw:message},message);
});
[
  ['sync','分帳佇列屬於其他旅程（sheet:x），已暫停送出'],
  ['data','ledger 下載失敗 — 沿用目前分帳快照,其餘工作表繼續更新'],
  ['repository','天氣讀取未完成；可於首頁重試。'],
  ['repository','分帳送出失敗:Failed to fetch'],
  ['sync','ledger 增量讀取降級回 CSV:HTTP 500']
].forEach(function([category,message]){
  const projected=impact.project({category:category,level:'warn',message:message});
  assert.strictEqual(projected.title,message,'a near match or another category keeps the raw text: '+message);
  assert.strictEqual(projected.impact,'請查看原始紀錄');
});

console.log('diagnostic impact module tests passed');
