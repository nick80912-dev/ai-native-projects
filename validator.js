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
  var result = { map:{}, headerIdx:-1, blockers:[], warnings:[] };
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
    var missingHeaderMessage = def.label + ':找不到表頭列 — 請確認工作表第一列為欄位名稱';
    AppLog.schema(missingHeaderMessage);
    result.blockers.push(makeValidationFinding('blocker','HEADER_MISSING',def.label,missingHeaderMessage));
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
    else{
      var unknownMessage = def.label + ':未知欄位「' + cell + '」(第' + (idx+1) + '欄) — 已忽略;若為新欄位請更新 schema.js';
      AppLog.schema(unknownMessage);
      result.warnings.push(makeValidationFinding('warning','HEADER_UNKNOWN',def.label,unknownMessage));
    }
  });
  def.columns.forEach(function(c){
    if(c.required && !(c.field in result.map)){
      var requiredMessage = def.label + ":Missing required field '" + c.header + "'(" + c.field + ") — 相關卡片可能無法顯示";
      AppLog.schema(requiredMessage);
      result.blockers.push(makeValidationFinding('blocker','HEADER_REQUIRED',def.label,requiredMessage));
    }
  });
  return result;
}

function makeValidationFinding(level,code,sheet,message){
  return { level:level, code:code, sheet:sheet||'', message:String(message||'') };
}

function sameDisplayName(a,b){
  var left=String(a||'').toLowerCase().replace(/\s+/g,'');
  var right=String(b||'').toLowerCase().replace(/\s+/g,'');
  return !!(left&&right&&(left.indexOf(right)>=0||right.indexOf(left)>=0));
}

function validateSnapshotData(db,raw,schema){
  var result={blockers:[],warnings:[]}, sheets=(schema&&schema.sheets)||{};
  function block(code,sheet,message){ result.blockers.push(makeValidationFinding('blocker',code,sheet,message)); }
  function warn(code,sheet,message){ result.warnings.push(makeValidationFinding('warning',code,sheet,message)); }
  function ids(list,field,sheet){
    var seen={};
    (list||[]).forEach(function(row){
      var id=String(row&&row[field]||'').toUpperCase().trim();
      if(!id) return;
      if(seen[id]) block('DUPLICATE_ID',sheet,'重複ID:' + sheet + ' ' + id);
      seen[id]=true;
    });
    return seen;
  }
  Object.keys(sheets).forEach(function(key){
    if(!raw||!raw[key]||String(raw[key]).trim().length<5){
      block('SHEET_MISSING',key,'資料缺席:工作表 ' + sheets[key].label + ' 無任何資料來源(內建/快取/線上皆空)');
    }
  });
  db=db||{};
  var pids=ids(db.placeList,'placeId','places');
  var rids=ids(db.rest,'restId','rest');
  ids(db.shop,'shopId','shop');
  ids(db.hotels,'hotelId','hotels');
  var typeColumn=null;
  ((sheets.places&&sheets.places.columns)||[]).forEach(function(column){ if(column.field==='type') typeColumn=column; });
  var typeValues=typeColumn&&typeColumn.values||{};
  (db.placeList||[]).forEach(function(place){
    var rawType=String(place.type||'').trim();
    if(!typeValues[rawType]&&!typeValues[rawType.toLowerCase()]){
      block('UNKNOWN_PLACE_TYPE','places','未註冊型別:' + place.placeId + ' 型別「' + rawType + '」無對應卡片渲染');
    }
  });
  (db.rest||[]).forEach(function(rest){
    var pid=String(rest.placeId||'').toUpperCase().trim();
    if(pid&&!pids[pid]) block('BROKEN_REF','rest','懸空引用:Restaurants ' + rest.restId + ' → ' + pid + ' 不存在於 Places');
  });
  (db.shop||[]).forEach(function(shop){
    var pid=String(shop.placeId||'').toUpperCase().trim();
    if(pid&&!pids[pid]) block('BROKEN_REF','shop','懸空引用:Shopping ' + shop.shopId + ' → ' + pid + ' 不存在於 Places');
  });
  (db.trip&&db.trip.days||[]).forEach(function(day){
    (day.items||[]).forEach(function(item){
      var ref=String(item.ref||'').toUpperCase().trim(), linked=null;
      if(/^P\d+/.test(ref)&&!pids[ref]) block('BROKEN_REF','itin','懸空引用:行程 ' + day.date + '「' + item.act + '」→ ' + ref + ' 不存在於 Places');
      if(/^R\d+/.test(ref)){
        if(!rids[ref]) block('BROKEN_REF','itin','懸空引用:行程 ' + day.date + '「' + item.act + '」→ ' + ref + ' 不存在於 Restaurants');
        linked=(db.rest||[]).filter(function(rest){return String(rest.restId||'').toUpperCase()===ref;})[0]||null;
        if(linked&&item.place&&linked.name&&!sameDisplayName(item.place,linked.name)){
          block('REF_NAME_MISMATCH','itin','引用名稱不一致:行程 ' + day.date + '「' + item.place + '」→ ' + ref + '「' + linked.name + '」');
        }
      }
    });
  });
  ['tripname','startdate','enddate','travelmode'].forEach(function(field){
    if(!db.cfg||!String(db.cfg[field]||'').trim()) block('CFG_REQUIRED','cfg','TripConfig 缺少 ' + field);
  });
  (db.placeList||[]).forEach(function(place){
    if(!place.web) warn('OPTIONAL_EMPTY','places',place.placeId + ' 未填寫網站');
  });
  return result;
}

/* ---- 專案健康檢查(資料一致性) ----
   回傳 findings 陣列並輸出報告;AI 每次交付前必跑 */
function healthCheck(){
  var validation = validateSnapshotData(DB,RAW,SCHEMA);
  var findings = validation.blockers.concat(validation.warnings);
  /* 輸出報告 */
  if(findings.length){
    console.warn('━━ Project Health Check:發現 ' + findings.length + ' 項 ━━');
    findings.forEach(function(f){ AppLog.data(f.message); });
  }else{
    console.log('━━ Project Health Check:PASS(資料一致性無異常)━━');
  }
  return findings.map(function(f){ return f.message; });
}
if(typeof window !== 'undefined') window.healthCheck = healthCheck;
