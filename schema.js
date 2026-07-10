/* ============================================================
   schema.js — 唯一資料規格(Single Source of Truth)
   ============================================================
   整個 App 的資料層都依賴這份 Schema:
   - Google Sheet 欄位定義(header + aliases)
   - Parser 動態解析(不再硬編碼欄位)
   - Validator 同步時檢查缺漏/未知欄位
   - schemaDoc() 自動產生對照文件

   ▍新增欄位 SOP(不用改 Parser):
   1. Google Sheet 加欄
   2. 本檔對應 sheet 的 columns 加一筆 { field, header, aliases?, required?, desc }
   3. UI 要顯示新欄位時才需要動渲染層
   ============================================================ */

var SCHEMA = {
  version: '2.1 (2026-07-10)',

  /* 發布來源(換試算表只改這裡) */
  pubBase: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRenmV8UxEzWbzSjKJKi4rSpYt63geBqhEkKsl1GemWVPmFKTcvv3Uk71Hjla3TGBpGIjC7bQDDdI00/pub?single=true&output=csv&gid=',
  fetchTimeoutMs: 10000,
  fetchRetries: 1,

  sheets: {

    /* ── 行程總表:固定 7 欄位置式解析 ── */
    itin: {
      gid: '1169222358', label: '行程總表', kind: 'itinerary',
      columns: [
        { field:'date',  header:'日期',     desc:'僅換日標記列使用(第N天MM/DD)' },
        { field:'time',  header:'時間',     desc:'HH:MM 或「16:00後」等自由文字' },
        { field:'act',   header:'詳細行程', desc:'活動名稱' },
        { field:'place', header:'地點',     desc:'地點顯示名稱(給人看)' },
        { field:'ref',   header:'ID',       desc:'Pxxx=地點 / Rxxx=餐廳(給程式讀)' },
        { field:'move',  header:'交通',     desc:'交通說明;空值時卡片退回資料庫交通時間' },
        { field:'note',  header:'備註',     desc:'自由備註' }
      ]
    },

    /* ── Places 地點主表 ── */
    places: {
      gid: '1089684162', label: 'Places', kind: 'table', idField: 'placeId',
      columns: [
        { field:'placeId', header:'PID',           aliases:['placeid','地點id'], required:true, desc:'地點唯一ID(P001…),不得重複' },
        { field:'name',    header:'地點',           aliases:['名稱'],            required:true, desc:'地點名稱(同時作為導航關鍵字)' },
        { field:'type',    header:'Type',           aliases:['類型'],            required:true, desc:'決定卡片型別,禁止程式猜測。值:購物/美食區/住宿/景點/機場/纜車/渡船口/渡輪/租車點',
          values:{ '購物':'shopping','美食區':'restarea','住宿':'hotel','景點':'attraction','機場':'attraction','纜車':'attraction','渡船口':'ferry','渡輪':'ferry','租車點':'parking',
                   'shopping':'shopping','restaurantarea':'restarea','hotel':'hotel','attraction':'attraction','ferryterminal':'ferry','parking':'parking' } },
        { field:'mapcode', header:'MAPCODE',        desc:'車用導航輸入碼(大字純顯示)' },
        { field:'travel',  header:'交通/交通時間',  aliases:['交通時間'], desc:'開車X分鐘/步行X分鐘;行程交通欄空值時顯示' },
        { field:'pnote',   header:'停車',           aliases:['停車備註','停車場'], desc:'停車資訊單欄;「停車同Pxxx」可繼承' },
        { field:'hours',   header:'營業時間',       aliases:['開放時間'] },
        { field:'ticket',  header:'門票',           desc:'門票或船票資訊' },
        { field:'web',     header:'官網',           aliases:['網站','網址'] },
        { field:'ttl',     header:'時刻表連結',     aliases:['時刻表'], desc:'渡輪等官方時刻表 URL' },
        { field:'note',    header:'備註' }
      ]
    },

    /* ── Restaurants 餐廳表 ── */
    rest: {
      gid: '1421821084', label: 'Restaurants', kind: 'table', idField: 'restId',
      columns: [
        { field:'restId',  header:'RID',        aliases:['restid','餐廳id'], required:true, desc:'餐廳唯一ID(R001…)' },
        { field:'placeId', header:'PID(可空白)', aliases:['pid','placeid'],  desc:'所屬地點;掛上後該地點卡自動列出' },
        { field:'name',    header:'餐廳名稱',    aliases:['店名','名稱'],     required:true },
        { field:'rating',  header:'Tabelog',    aliases:['評分'], desc:'數字自動顯示為「Tabelog X.XX」' },
        { field:'cat',     header:'餐廳類型',    aliases:['分類'] },
        { field:'hours',   header:'營業時間' },
        { field:'pay',     header:'付款方式',    aliases:['付款'] },
        { field:'travel',  header:'交通時間',    desc:'開車/步行時間' },
        { field:'pnote',   header:'停車' },
        { field:'note',    header:'備註' }
      ]
    },

    /* ── Shopping 商店表 ── */
    shop: {
      gid: '1182059264', label: 'Shopping', kind: 'table', idField: 'shopId',
      columns: [
        { field:'shopId',  header:'SID',      aliases:['shopid','商店id'], required:true, desc:'商店唯一ID(S001…)' },
        { field:'placeId', header:'PID',      aliases:['placeid'],         required:true, desc:'所屬商場(Places.PID)' },
        { field:'name',    header:'品牌名稱', aliases:['店名','名稱'],      required:true },
        { field:'floor',   header:'樓層',     required:true, desc:'購物頁樓層摺疊依據' },
        { field:'cat',     header:'分類' },
        { field:'must',    header:'必逛',     desc:'填「是」顯示必逛徽章' },
        { field:'taxfree', header:'免稅',     desc:'填「是」顯示免稅徽章' },
        { field:'note',    header:'備註',     desc:'「櫃位 XXX」會顯示於店名旁' }
      ]
    },

    /* ── Hotels 住宿表 ── */
    hotels: {
      gid: '792115203', label: 'Hotels', kind: 'table', idField: 'hotelId',
      columns: [
        { field:'hotelId', header:'HID', aliases:['hotelid','住宿id'], required:true },
        { field:'name',    header:'名稱', required:true, desc:'以名稱比對 Places 住宿型地點' },
        { field:'checkin', header:'入住' },
        { field:'checkout',header:'退房' },
        { field:'addr',    header:'地址' },
        { field:'pnote',   header:'停車' },
        { field:'dates',   header:'適用日期' },
        { field:'note',    header:'備註' }
      ]
    },

    /* ── Expenses 支出表:自由格式(非欄位表) ── */
    exp: {
      gid: '1354339857', label: 'Expenses', kind: 'freeform-expense',
      layout: {
        membersRowMark: '同行成員',   // 此列第2欄起為成員名單
        catCol: 0,                    // 類別(交通/住宿/門票…,僅此欄有值=類別列)
        nameCol: 1,                   // 明細
        twdCol: 4,                    // $台幣
        jpyCol: 5,                    // ¥日幣
        noteCol: 6,                   // 備註
        totalMarks: ['小計','總計']   // 合計列
      },
      desc: '行前團費。旅途記帳在 App 端(localStorage),兩者於分帳頁並列不重複計算。同行成員自動帶入分帳成員(首次)。'
    },

    /* ── TripConfig 設定表:Key/Value ── */
    cfg: {
      gid: '1070234314', label: 'TripConfig', kind: 'keyvalue',
      keys: [
        { field:'tripname',   header:'Trip Name',   desc:'顯示於頂欄標題' },
        { field:'startdate',  header:'Start Date' },
        { field:'enddate',    header:'End Date' },
        { field:'travelmode', header:'Travel Mode', aliases:['transport','交通模式'],
          values:{ 'driving':'drive','drive':'drive','自駕':'drive','開車':'drive',
                   'transit':'transit','train':'transit','電車':'transit','大眾運輸':'transit' },
          desc:'Driving→drive(🚗導航+停車卡);Transit/Train→transit(🚃路線)' },
        { field:'currency',   header:'Currency' },
        { field:'homepage',   header:'Home Page',   desc:'預設分頁(⚠️ 目前**未啟用**,App 固定 Today;填寫無效果)' }
      ]
    }
  }
};

/* ── 由 Schema 自動產生對照文件(Markdown) ── */
function schemaDoc(){
  var md = '# CMS ↔ App 欄位對照(由 schema.js 自動產生)\n\n版本:' + SCHEMA.version + '\n';
  Object.keys(SCHEMA.sheets).forEach(function(k){
    var s = SCHEMA.sheets[k];
    md += '\n## ' + s.label + '(gid=' + s.gid + ',kind=' + s.kind + ')\n';
    if(s.columns){
      md += '| Google Sheet 欄位 | App Property | 必填 | 說明 |\n|---|---|---|---|\n';
      s.columns.forEach(function(c){
        var h = c.header + (c.aliases ? '(別名:' + c.aliases.join('/') + ')' : '');
        md += '| ' + h + ' | ' + c.field + ' | ' + (c.required?'✅':'') + ' | ' + (c.desc||'') + ' |\n';
      });
    }
    if(s.keys){
      md += '| Key | App Property | 說明 |\n|---|---|---|\n';
      s.keys.forEach(function(c){
        var h = c.header + (c.aliases ? '(別名:' + c.aliases.join('/') + ')' : '');
        md += '| ' + h + ' | ' + c.field + ' | ' + (c.desc||'') + ' |\n';
      });
    }
    if(s.layout){
      md += '自由格式:成員列標記「' + s.layout.membersRowMark + '」;欄位位置 → 類別[' + s.layout.catCol + '] 明細[' + s.layout.nameCol + '] 台幣[' + s.layout.twdCol + '] 日幣[' + s.layout.jpyCol + '] 備註[' + s.layout.noteCol + ']';
      if(s.layout.totalMarks) md += ';合計列標記「' + s.layout.totalMarks.join('/') + '」';
      md += '\n';
    }
    if(s.desc) md += '> ' + s.desc + '\n';
  });
  return md;
}
if(typeof window !== 'undefined') window.schemaDoc = schemaDoc;
