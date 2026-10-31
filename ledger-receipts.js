/* ledger-receipts.js — 分帳收據照片（backlog #59，v167）
   ============================================================
   Bar 2026-10-19 裁定：收據照片只存在拍照的那支手機（不上傳、不進個人備份）；
   團體帳與個人帳都可以夾；每筆最多 3 張。Bar 2026-10-30：先用照片的拍攝時間帶入
   日期時間；之後再用雲端 AI 讀金額（另一版）。
   本檔只放純函式（EXIF 拍攝時間、紀錄對應鍵、連結表），照片本身的 IndexedDB
   沿用 shopping-photo-store.js 的 driver，但放在獨立的資料庫，採買照片的
   孤兒清理不會刪到收據。
   v171（backlog #61）：加照片後經 Apps Script 請 Google Gemini 讀收據上的日期、時間、總額、
   幣別、店名（Bar 2026-10-31 選免費版、同意照片傳到 Google 一次）；normalizeRecognition()
   檢查 AI 回來的內容，格式不對的欄位一律當作沒讀到。
   ============================================================ */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.TripLedgerReceipts=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var MAX_PHOTOS=3;
  var DB_NAME='trip-receipt-media';
  var STORE_NAME='receipt-photos';
  var ID_PREFIX='receipt-photo-';
  /* EXIF 幾乎都在檔頭 64 KB 內；多讀一些保險 */
  var EXIF_SCAN_BYTES=256*1024;

  function pad(value){return ('0'+value).slice(-2);}

  /* JPEG 的 EXIF 拍攝時間（DateTimeOriginal，沒有就用 DateTimeDigitized／DateTime）。
     回傳 {date:'YYYY/MM/DD',time:'HH:MM'}，讀不到回 null。EXIF 記的是相機（手機）
     當地時間，沒有時區 —— 跟 App 一律用手機時區的做法一致（v165）。 */
  function readExifDateTime(buffer){
    var view;
    try{view=new DataView(buffer instanceof ArrayBuffer?buffer:buffer.buffer,buffer.byteOffset||0,buffer.byteLength);}catch(error){return null;}
    var length=view.byteLength;
    if(length<4||view.getUint16(0)!==0xFFD8)return null;
    var offset=2;
    while(offset+4<=length){
      if(view.getUint8(offset)!==0xFF)return null;
      var marker=view.getUint8(offset+1);
      if(marker===0xD9||marker===0xDA)return null;           // 影像資料開始，後面不會有 EXIF
      var size=view.getUint16(offset+2);
      if(size<2)return null;
      if(marker===0xE1&&offset+10<=length&&
        view.getUint32(offset+4)===0x45786966&&view.getUint16(offset+8)===0){   // "Exif\0\0"
        return readTiffDateTime(view,offset+10,Math.min(length,offset+2+size));
      }
      offset+=2+size;
    }
    return null;
  }

  function readTiffDateTime(view,start,end){
    if(start+8>end)return null;
    var order=view.getUint16(start),little;
    if(order===0x4949)little=true;else if(order===0x4D4D)little=false;else return null;
    function u16(at){return at+2<=end?view.getUint16(at,little):null;}
    function u32(at){return at+4<=end?view.getUint32(at,little):null;}
    if(u16(start+2)!==42)return null;
    function readIfd(ifdOffset){
      var at=start+ifdOffset,count=u16(at),tags={};
      if(count===null||count>512)return tags;
      for(var index=0;index<count;index++){
        var entry=at+2+index*12,tag=u16(entry),type=u16(entry+2),num=u32(entry+4);
        if(tag===null||num===null)break;
        if(type===2){                                            // ASCII
          var dataAt=num<=4?entry+8:start+u32(entry+8),text='';
          for(var i=0;i<num&&dataAt+i<end;i++){var code=view.getUint8(dataAt+i);if(!code)break;text+=String.fromCharCode(code);}
          tags[tag]=text;
        }else if(type===4||type===3){
          tags[tag]=type===4?u32(entry+8):u16(entry+8);
        }
      }
      return tags;
    }
    var first=u32(start+4);if(first===null)return null;
    var ifd0=readIfd(first),exif=typeof ifd0[0x8769]==='number'?readIfd(ifd0[0x8769]):{};
    return parseExifDateTime(exif[0x9003])||parseExifDateTime(exif[0x9004])||parseExifDateTime(ifd0[0x0132]);
  }

  function parseExifDateTime(text){
    var match=/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})/.exec(String(text||''));
    if(!match)return null;
    var year=Number(match[1]),month=Number(match[2]),day=Number(match[3]),hour=Number(match[4]),minute=Number(match[5]);
    if(year<2000||year>2099||month<1||month>12||day<1||day>31||hour>23||minute>59)return null;
    var check=new Date(year,month-1,day);
    if(check.getFullYear()!==year||check.getMonth()!==month-1||check.getDate()!==day)return null;
    return {date:year+'/'+pad(month)+'/'+pad(day),time:pad(hour)+':'+pad(minute)};
  }

  /* 一筆帳（含同一張收據的多品項）共用一個對應鍵：
     編輯過的指回原紀錄（replacesRecordId），多品項用 batchId，其餘用自己的 id。 */
  function entryKey(record){
    if(!record)return '';
    return String(record.replacesRecordId||record.batchId||record.id||'').trim();
  }

  function cleanIds(ids){
    var seen={},out=[];
    (Array.isArray(ids)?ids:[]).forEach(function(id){
      id=String(id||'').trim();
      if(id&&!seen[id]&&out.length<MAX_PHOTOS){seen[id]=true;out.push(id);}
    });
    return out;
  }

  function normalizeLinks(value){
    var links={};
    if(!value||typeof value!=='object'||Array.isArray(value))return links;
    Object.keys(value).forEach(function(key){var ids=cleanIds(value[key]);if(key&&ids.length)links[key]=ids;});
    return links;
  }

  function photosFor(links,record){
    var key=entryKey(record);
    return key&&links&&links[key]?links[key].slice():[];
  }

  /* 存檔後：舊的對應鍵拿掉，新的對應鍵指向這張表單的照片（沒有照片就拿掉） */
  function relink(links,oldKeys,newKeys,photoIds){
    var next=normalizeLinks(links),ids=cleanIds(photoIds),keep={};
    (newKeys||[]).forEach(function(key){if(key)keep[key]=true;});
    (oldKeys||[]).forEach(function(key){if(key&&!keep[key])delete next[key];});
    Object.keys(keep).forEach(function(key){if(ids.length)next[key]=ids.slice();else delete next[key];});
    return next;
  }

  function forgetKeys(links,keys){
    var next=normalizeLinks(links);
    (keys||[]).forEach(function(key){delete next[key];});
    return next;
  }

  function referencedPhotoIds(links,extra){
    var ids={};
    Object.keys(links||{}).forEach(function(key){(links[key]||[]).forEach(function(id){ids[id]=true;});});
    (extra||[]).forEach(function(id){if(id)ids[id]=true;});
    return ids;
  }

  /* v171：AI 讀到的收據內容 → {date:'YYYY/MM/DD',time:'HH:MM',total:數字或 null,currency:'ABC',storeName,payMethod,category,found}。
     日期限 2000–2100 且要是真的日期；總額要是正數；幣別要是三個英文字母；店名最多 40 字。 */
  function normalizeRecognition(raw){
    var source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    function text(name){var value=source[name];return typeof value==='string'||typeof value==='number'?String(value).trim():'';}
    var date='',time='',total=null,currency='',storeName='';
    var dateMatch=text('date').replace(/[.\-年月]/g,'/').replace(/日$/,'').match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if(dateMatch){
      var year=Number(dateMatch[1]),month=Number(dateMatch[2]),day=Number(dateMatch[3]),check=new Date(Date.UTC(year,month-1,day));
      if(year>=2000&&year<=2100&&check.getUTCMonth()===month-1&&check.getUTCDate()===day)date=year+'/'+pad(month)+'/'+pad(day);
    }
    var timeMatch=text('time').match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if(timeMatch&&Number(timeMatch[1])<24&&Number(timeMatch[2])<60)time=pad(Number(timeMatch[1]))+':'+timeMatch[2];
    var totalText=text('total').replace(/[,\s]/g,''),amount=Number(totalText);
    if(totalText&&isFinite(amount)&&amount>0&&amount<1e10)total=amount;
    var code=text('currency').toUpperCase();
    if(/^[A-Z]{3}$/.test(code))currency=code;
    storeName=text('storeName').replace(/\s+/g,' ').slice(0,40);
    /* v173：支付方式與類別是 App 送去的選項名稱之一；這裡只整理字串，是否在清單內由 App 判斷 */
    var payMethod=text('payMethod').slice(0,12),category=text('category').slice(0,12);
    /* v173：多品項逐筆帶入用的品項（名稱 20 字、金額正數、最多 30 項）與折扣總額 */
    function positive(value){var cleaned=String(value==null?'':value).replace(/[,\s]/g,''),number=Number(cleaned);return cleaned&&isFinite(number)&&number>0&&number<1e10?number:null;}
    var items=[];
    (Array.isArray(source.items)?source.items:[]).forEach(function(item){
      if(items.length>=30||!item||typeof item!=='object')return;
      var name=typeof item.name==='string'?item.name.replace(/\s+/g,' ').trim().slice(0,20):'',amount=positive(item.amount);
      if(name&&amount!==null)items.push({name:name,amount:amount});
    });
    var discount=positive(source.discount);
    /* v176：免稅（deducted 結帳已扣稅／refundable 之後可退稅）、印在收據上的稅率、品項是否含稅 */
    var taxFree=source.taxFree==='deducted'||source.taxFree==='refundable'?source.taxFree:'';
    var taxRates=[];
    (Array.isArray(source.taxRates)?source.taxRates:[]).forEach(function(rate){
      var number=positive(String(rate==null?'':rate).replace(/%$/,''));
      if(number!==null&&number<=100&&taxRates.indexOf(number)<0&&taxRates.length<3)taxRates.push(Math.round(number*10)/10);
    });
    var pricesIncludeTax=typeof source.pricesIncludeTax==='boolean'?source.pricesIncludeTax:null;
    var taxAmount=positive(source.taxAmount);   // v177：收據上的稅額合計
    return {date:date,time:time,total:total,currency:currency,storeName:storeName,payMethod:payMethod,category:category,items:items,discount:discount,
      taxFree:taxFree,taxRates:taxRates,pricesIncludeTax:pricesIncludeTax,taxAmount:taxAmount,
      found:!!(date||total!==null||storeName||payMethod||category||items.length||taxFree||taxRates.length||taxAmount!==null)};
  }

  return {
    normalizeRecognition:normalizeRecognition,
    MAX_PHOTOS:MAX_PHOTOS,
    DB_NAME:DB_NAME,
    STORE_NAME:STORE_NAME,
    ID_PREFIX:ID_PREFIX,
    EXIF_SCAN_BYTES:EXIF_SCAN_BYTES,
    readExifDateTime:readExifDateTime,
    parseExifDateTime:parseExifDateTime,
    entryKey:entryKey,
    normalizeLinks:normalizeLinks,
    photosFor:photosFor,
    relink:relink,
    forgetKeys:forgetKeys,
    referencedPhotoIds:referencedPhotoIds
  };
});
