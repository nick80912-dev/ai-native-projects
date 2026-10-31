/* trip-currency.js — 旅程幣別（backlog #62，v168）
   ============================================================
   Bar 2026-10-31：之後不一定去日本。結算一律台幣；一趟一種當地幣別（TripConfig `Currency`，
   沒填就是 JPY，岡山不變）；美金、歐元這類有小數的幣別記到分。
   App 內部金額一律是「最小單位」的整數（美金存分、日圓存圓），既有的整數分攤與結算不用改；
   本檔只負責幣別資料、最小單位與一般金額的換算、輸入解析與顯示格式。
   App 內部仍用 'JPY'／'TWD' 兩個代號代表「當地幣別」／「台幣」兩個槽位（見 shell 的
   ledgerCurrencyCodeOf），真正的幣別代碼只出現在畫面、試算表與 Apps Script。
   ============================================================ */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.TripCurrency=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var HOME='TWD';
  var DEFAULT_LOCAL='JPY';
  /* 常用幣別；小數位數為實際記帳用的位數（台幣不用角，記整數） */
  var TABLE={
    JPY:{name:'日幣',symbol:'¥',decimals:0},   // 岡山以來畫面都寫「日幣」
    TWD:{name:'台幣',symbol:'NT$',decimals:0},
    KRW:{name:'韓元',symbol:'₩',decimals:0},
    USD:{name:'美元',symbol:'US$',decimals:2},
    EUR:{name:'歐元',symbol:'€',decimals:2},
    THB:{name:'泰銖',symbol:'฿',decimals:2},
    HKD:{name:'港幣',symbol:'HK$',decimals:2},
    MOP:{name:'澳門幣',symbol:'MOP$',decimals:2},
    CNY:{name:'人民幣',symbol:'CN¥',decimals:2},
    SGD:{name:'新加坡幣',symbol:'S$',decimals:2},
    MYR:{name:'令吉',symbol:'RM',decimals:2},
    PHP:{name:'披索',symbol:'₱',decimals:2},
    VND:{name:'越南盾',symbol:'₫',decimals:0},
    IDR:{name:'印尼盾',symbol:'Rp',decimals:0},
    GBP:{name:'英鎊',symbol:'£',decimals:2},
    AUD:{name:'澳幣',symbol:'A$',decimals:2},
    NZD:{name:'紐幣',symbol:'NZ$',decimals:2},
    CAD:{name:'加幣',symbol:'C$',decimals:2},
    CHF:{name:'瑞士法郎',symbol:'CHF ',decimals:2}
  };

  function normalizeCode(value){
    var code=String(value==null?'':value).trim().toUpperCase();
    return /^[A-Z]{3}$/.test(code)?code:'';
  }

  /* 表上沒有的幣別：小數位數照瀏覽器的 ISO 4217 資料，名稱與符號就用代碼 */
  function info(value){
    var code=normalizeCode(value)||DEFAULT_LOCAL;
    if(TABLE[code])return {code:code,name:TABLE[code].name,symbol:TABLE[code].symbol,decimals:TABLE[code].decimals};
    var decimals=2;
    try{decimals=new Intl.NumberFormat('en-US',{style:'currency',currency:code}).resolvedOptions().maximumFractionDigits;}catch(error){decimals=2;}
    if(!(decimals>=0&&decimals<=3))decimals=2;
    return {code:code,name:code,symbol:code+' ',decimals:decimals};
  }

  function decimals(code){return info(code).decimals;}
  function factor(code){return Math.pow(10,decimals(code));}

  /* 一般金額（試算表、Apps Script）→ 最小單位整數 */
  function toMinor(major,code){
    var value=Number(major);
    if(!isFinite(value))return NaN;
    return Math.round(value*factor(code));
  }

  /* 最小單位整數 → 一般金額（送 Apps Script、匯出）；小數位數 0 時原樣 */
  function toMajor(minor,code){
    var value=Number(minor),f=factor(code);
    if(!isFinite(value))return NaN;
    if(f===1)return value;
    return Math.round(value)/f;
  }

  /* 表單輸入的文字 → 最小單位整數；格式不對、小數超過該幣別位數或不是正數回 NaN */
  function parseInput(text,code){
    var raw=String(text==null?'':text).trim(),places=decimals(code);
    var pattern=places>0?new RegExp('^\\d+(?:\\.\\d{1,'+places+'})?$'):/^\d+$/;
    if(!pattern.test(raw))return NaN;
    var parts=raw.split('.'),whole=Number(parts[0]),fraction=parts[1]||'';
    while(fraction.length<places)fraction+='0';
    var minor=whole*factor(code)+(fraction?Number(fraction):0);
    return Number.isSafeInteger(minor)?minor:NaN;
  }

  /* 最小單位整數 → 表單上顯示的文字（不加千分位，方便再編輯） */
  function inputText(minor,code){
    var value=Number(minor),places=decimals(code);
    if(!isFinite(value))return '';
    if(!places)return String(Math.round(value));
    return (Math.round(value)/factor(code)).toFixed(places);
  }

  /* 最小單位整數 → 有千分位的數字文字（不含符號） */
  function formatNumber(minor,code){
    var value=Number(minor),places=decimals(code);
    if(!isFinite(value))value=0;
    if(!places)return Math.round(value).toLocaleString();
    return (Math.round(value)/factor(code)).toLocaleString(undefined,{minimumFractionDigits:places,maximumFractionDigits:places});
  }

  /* 最小單位整數 → 「符號＋金額」，例如 ¥1,500、NT$315、US$12.50（負數照舊寫成 ¥-1,500） */
  function format(minor,code){
    return info(code).symbol+formatNumber(minor,code);
  }

  /* 最小單位的當地幣 → 台幣（整數）；rate＝1 單位當地幣等於多少台幣 */
  function localMinorToHome(minor,code,rate){
    return Math.round(Number(minor)/factor(code)*Number(rate));
  }
  /* 台幣（整數）→ 最小單位的當地幣 */
  function homeToLocalMinor(home,code,rate){
    return Math.round(Number(home)/Number(rate)*factor(code));
  }

  return {
    HOME:HOME,
    DEFAULT_LOCAL:DEFAULT_LOCAL,
    TABLE:TABLE,
    normalizeCode:normalizeCode,
    info:info,
    decimals:decimals,
    factor:factor,
    toMinor:toMinor,
    toMajor:toMajor,
    parseInput:parseInput,
    inputText:inputText,
    formatNumber:formatNumber,
    format:format,
    localMinorToHome:localMinorToHome,
    homeToLocalMinor:homeToLocalMinor
  };
});
