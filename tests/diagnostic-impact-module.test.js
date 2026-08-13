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

console.log('diagnostic impact module tests passed');
