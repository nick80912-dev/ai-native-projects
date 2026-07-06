/* ============================================================
   validator.js — 自體防錯防線(Guardrails)
   ============================================================
   職責:
   1. AppLog:六類錯誤日誌,格式固定「[分類] 訊息」,
      AI Debug 時看一眼 console 即可定位,不需貼整段程式碼
   2. 表頭驗證(buildHeaderMap):缺必填欄/未知欄位 → 警告不崩潰
   3. healthCheck():資料一致性健康報告(重複ID/懸空引用/型別覆蓋)
   依賴:schema.js(SCHEMA 必須先載入)
   ============================================================ */

/* ---- 六類錯誤日誌 ---- */
var AppLog = {
  schema: function(msg){ console.warn('[Schema Error] ' + msg); },
  parser: function(msg){ console.warn('[Parser Error] ' + msg); },
  data:   function(msg){ console.warn('[Data Error] ' + msg); },
  repo:   function(msg){ console.warn('[Repository Error] ' + msg); },
  render: function(msg){ console.error('[Render Error] ' + msg); },
  sync:   function(msg){ console.warn('[Sync Error] ' + msg); }
};

/* ---- 表頭正規化 ---- */
function normH(h){ return String(h||'').trim().toLowerCase().replace(/\s+/g,''); }
function normHBase(h){ return normH(h).replace(/[（(].*?[)）]/g,''); }

/* ---- 表頭驗證與對照(Schema 驅動) ---- */
function buildHeaderMap(rows, def){
  var result = { map:{}, headerIdx:-1 };
  var best = { idx:-1, hits:0 };
  for(var i=0;i<Math.min(rows.length,10);i++){
    var hits = 0;
    (rows[i]||[]).forEach(function(cell){
      var h = normHBase(cell);
      if(!h) return;
      def.columns.forEach(function(c){
        var cand = [c.header].concat(c.aliases||[]).map(normHBase);
        if(cand.indexOf(h)>=0) hits++;
      });
    });
    if(hits > best.hits){ best = { idx:i, hits:hits }; }
  }
  if(best.idx < 0 || best.hits === 0){
    AppLog.schema(def.label + ':找不到表頭列 — 請確認工作表第一列為欄位名稱');
    return result;
  }
  result.headerIdx = best.idx;
  rows[best.idx].forEach(function(cell, idx){
    var h = normHBase(cell);
    if(!h) return;
    var matched = null;
    def.columns.forEach(function(c){
      if(matched) return;
      var cand = [c.header].concat(c.aliases||[]).map(normHBase);
      if(cand.indexOf(h)>=0) matched = c.field;
    });
    if(matched){ if(!(matched in result.map)) result.map[matched] = idx; }
    else AppLog.schema(def.label + ':未知欄位「' + cell + '」(第' + (idx+1) + '欄) — 已忽略;若為新欄位請更新 schema.js');
  });
  def.columns.forEach(function(c){
    if(c.required && !(c.field in result.map)){
      AppLog.schema(def.label + ":Missing required field '" + c.header + "'(" + c.field + ") — 相關卡片可能無法顯示");
    }
  });
  return result;
}

/* ---- 專案健康檢查(資料一致性) ----
   回傳 findings 陣列並輸出報告;AI 每次交付前必跑 */
function healthCheck(){
  var f = [];
  function dupCheck(list, idField, label){
    var seen = {};
    (list||[]).forEach(function(r){
      var id = (r[idField]||'').toUpperCase();
      if(!id) return;
      if(seen[id]) f.push('重複ID:' + label + ' ' + id);
      seen[id] = true;
    });
    return seen;
  }
  var pids = dupCheck(DB.placeList, 'placeId', 'Places');
  dupCheck(DB.rest, 'restId', 'Restaurants');
  dupCheck(DB.shop, 'shopId', 'Shopping');
  /* 懸空引用 */
  (DB.rest||[]).forEach(function(r){
    if(r.placeId && !pids[r.placeId.toUpperCase()]) f.push('懸空引用:Restaurants ' + r.restId + ' → ' + r.placeId + ' 不存在於 Places');
  });
  (DB.shop||[]).forEach(function(s){
    if(s.placeId && !pids[s.placeId.toUpperCase()]) f.push('懸空引用:Shopping ' + s.shopId + ' → ' + s.placeId + ' 不存在於 Places');
  });
  if(DB.trip) DB.trip.days.forEach(function(d){
    d.items.forEach(function(it){
      var ref = (it.ref||'').toUpperCase().trim();
      if(/^P\d+/.test(ref) && !pids[ref]) f.push('懸空引用:行程 ' + d.date + '「' + it.act + '」→ ' + ref + ' 不存在於 Places');
      if(/^R\d+/.test(ref) && !(DB.rest||[]).some(function(r){ return (r.restId||'').toUpperCase()===ref; }))
        f.push('懸空引用:行程 ' + d.date + '「' + it.act + '」→ ' + ref + ' 不存在於 Restaurants');
    });
  });
  /* 渲染型別覆蓋:資料中出現的型別必須都有對應卡片 */
  var covered = ['shopping','restarea','hotel','ferry','parking','attraction'];
  (DB.placeList||[]).forEach(function(p){
    if(covered.indexOf(p.tnorm)<0) f.push('未註冊型別:' + p.placeId + ' 型別「' + p.type + '」無對應卡片渲染');
  });
  /* Sheet 資料到位 */
  Object.keys(SCHEMA.sheets).forEach(function(k){
    if(!RAW[k]) f.push('資料缺席:工作表 ' + SCHEMA.sheets[k].label + ' 無任何資料來源(內建/快取/線上皆空)');
  });
  /* 輸出報告 */
  if(f.length){
    console.warn('━━ Project Health Check:發現 ' + f.length + ' 項 ━━');
    f.forEach(function(x){ AppLog.data(x); });
  }else{
    console.log('━━ Project Health Check:PASS(資料一致性無異常)━━');
  }
  return f;
}
if(typeof window !== 'undefined') window.healthCheck = healthCheck;
