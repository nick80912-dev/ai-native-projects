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
  db=db&&typeof db==='object'&&!Array.isArray(db)?db:{};
  function validList(field,sheet){
    if(!Array.isArray(db[field])){
      block('DB_STRUCTURE',sheet,field + ' 必須是陣列');
      return [];
    }
    return db[field];
  }
  var placeList=validList('placeList','places');
  var restList=validList('rest','rest');
  var shopList=validList('shop','shop');
  var hotelList=validList('hotels','hotels');
  var tripDays=[];
  if(!db.trip||typeof db.trip!=='object'||Array.isArray(db.trip)){
    block('DB_STRUCTURE','itin','trip 必須是物件');
  }else if(!Array.isArray(db.trip.days)||!db.trip.days.length){
    block('DB_STRUCTURE','itin','trip.days 必須是非空陣列');
  }else{
    tripDays=db.trip.days;
  }
  var cfg=null;
  if(!db.cfg||typeof db.cfg!=='object'||Array.isArray(db.cfg)){
    block('DB_STRUCTURE','cfg','cfg 必須是物件');
  }else{
    cfg=db.cfg;
  }
  var pids=ids(placeList,'placeId','places');
  var rids=ids(restList,'restId','rest');
  ids(shopList,'shopId','shop');
  ids(hotelList,'hotelId','hotels');
  var typeColumn=null;
  ((sheets.places&&sheets.places.columns)||[]).forEach(function(column){ if(column.field==='type') typeColumn=column; });
  var typeValues=typeColumn&&typeColumn.values||{};
  placeList.forEach(function(place){
    var rawType=String(place.type||'').trim();
    if(!typeValues[rawType]&&!typeValues[rawType.toLowerCase()]){
      block('UNKNOWN_PLACE_TYPE','places','未註冊型別:' + place.placeId + ' 型別「' + rawType + '」無對應卡片渲染');
    }
  });
  restList.forEach(function(rest){
    var pid=String(rest.placeId||'').toUpperCase().trim();
    if(pid&&!pids[pid]) block('BROKEN_REF','rest','懸空引用:Restaurants ' + rest.restId + ' → ' + pid + ' 不存在於 Places');
  });
  shopList.forEach(function(shop){
    var pid=String(shop.placeId||'').toUpperCase().trim();
    if(pid&&!pids[pid]) block('BROKEN_REF','shop','懸空引用:Shopping ' + shop.shopId + ' → ' + pid + ' 不存在於 Places');
  });
  tripDays.forEach(function(day){
    if(!day||typeof day!=='object'||Array.isArray(day)||!Array.isArray(day.items)){
      block('DB_STRUCTURE','itin','trip.days 的每一天都必須包含 items 陣列');
      return;
    }
    day.items.forEach(function(item){
      var ref=String(item.ref||'').toUpperCase().trim(), linked=null;
      if(/^P\d+/.test(ref)&&!pids[ref]) block('BROKEN_REF','itin','懸空引用:行程 ' + day.date + '「' + item.act + '」→ ' + ref + ' 不存在於 Places');
      if(/^R\d+/.test(ref)){
        if(!rids[ref]) block('BROKEN_REF','itin','懸空引用:行程 ' + day.date + '「' + item.act + '」→ ' + ref + ' 不存在於 Restaurants');
        linked=restList.filter(function(rest){return String(rest.restId||'').toUpperCase()===ref;})[0]||null;
        if(linked&&item.place&&linked.name&&!sameDisplayName(item.place,linked.name)){
          block('REF_NAME_MISMATCH','itin','引用名稱不一致:行程 ' + day.date + '「' + item.place + '」→ ' + ref + '「' + linked.name + '」');
        }
      }
    });
  });
  if(cfg){
    ['tripname','startdate','enddate','travelmode'].forEach(function(field){
      if(!String(cfg[field]||'').trim()) block('CFG_REQUIRED','cfg','TripConfig 缺少 ' + field);
    });
    function isoDateValue(value){
      var match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||'').trim());
      if(!match) return null;
      var year=Number(match[1]), month=Number(match[2]), day=Number(match[3]);
      var leap=year%4===0&&(year%100!==0||year%400===0);
      var monthDays=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
      if(year<1||month<1||month>12||day<1||day>monthDays[month-1]) return null;
      return year*10000+month*100+day;
    }
    var startText=String(cfg.startdate||'').trim(), endText=String(cfg.enddate||'').trim();
    var startValue=startText?isoDateValue(startText):null, endValue=endText?isoDateValue(endText):null;
    if(startText&&startValue===null) block('CFG_DATE','cfg','TripConfig startdate 必須是有效的 YYYY-MM-DD 日期');
    if(endText&&endValue===null) block('CFG_DATE','cfg','TripConfig enddate 必須是有效的 YYYY-MM-DD 日期');
    if(startValue!==null&&endValue!==null&&endValue<startValue) block('CFG_DATE','cfg','TripConfig enddate 不得早於 startdate');
    var mode=String(cfg.travelmode||'').trim().toLowerCase();
    if(mode&&mode!=='drive'&&mode!=='transit') block('CFG_TRAVELMODE','cfg','TripConfig travelmode 必須是 drive 或 transit');
  }
  placeList.forEach(function(place){
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
