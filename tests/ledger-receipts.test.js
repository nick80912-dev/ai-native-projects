/* v167（backlog #59）：收據照片的純函式 —— EXIF 拍攝時間、紀錄對應鍵、連結表 */
const assert=require('assert');
const R=require('../ledger-receipts.js');

/* 組一個帶 EXIF 的最小 JPEG：IFD0 有 DateTime 與 ExifIFD 指標，ExifIFD 有 DateTimeOriginal */
function jpegWithExif(options){
  const little=options.little!==false;
  const original=options.original,modified=options.modified;
  const tiff=[];
  const u16=value=>little?[value&255,value>>8&255]:[value>>8&255,value&255];
  const u32=value=>little?[value&255,value>>8&255,value>>16&255,value>>>24&255]:[value>>>24&255,value>>16&255,value>>8&255,value&255];
  const ascii=text=>Array.from(Buffer.from(text+'\0','latin1'));
  const ifd0Entries=(modified?1:0)+1;
  const ifd0Size=2+ifd0Entries*12+4;
  const exifIfdAt=8+ifd0Size;
  const exifEntries=original?1:0;
  const exifSize=2+exifEntries*12+4;
  let dataAt=exifIfdAt+exifSize;
  const data=[];
  const pointerTo=bytes=>{const at=dataAt;data.push(...bytes);dataAt+=bytes.length;return at;};
  tiff.push(...(little?[0x49,0x49]:[0x4D,0x4D]),...u16(42),...u32(8));
  tiff.push(...u16(ifd0Entries));
  if(modified){const bytes=ascii(modified);tiff.push(...u16(0x0132),...u16(2),...u32(bytes.length),...u32(pointerTo(bytes)));}
  tiff.push(...u16(0x8769),...u16(4),...u32(1),...u32(exifIfdAt));
  tiff.push(...u32(0));
  tiff.push(...u16(exifEntries));
  if(original){const bytes=ascii(original);tiff.push(...u16(0x9003),...u16(2),...u32(bytes.length),...u32(pointerTo(bytes)));}
  tiff.push(...u32(0));
  tiff.push(...data);
  const app1=[0x45,0x78,0x69,0x66,0,0,...tiff];
  const size=app1.length+2;
  return new Uint8Array([0xFF,0xD8,0xFF,0xE0,0,4,0,0,0xFF,0xE1,size>>8&255,size&255,...app1,0xFF,0xD9]);
}

/* 拍攝時間：兩種位元組順序、沒有 DateTimeOriginal 時用 DateTime */
assert.deepStrictEqual(R.readExifDateTime(jpegWithExif({original:'2026:10:20 12:34:56'})),{date:'2026/10/20',time:'12:34'});
assert.deepStrictEqual(R.readExifDateTime(jpegWithExif({original:'2026:10:21 08:05:00',little:false})),{date:'2026/10/21',time:'08:05'},'big-endian EXIF');
assert.deepStrictEqual(R.readExifDateTime(jpegWithExif({modified:'2026:10:22 19:00:00'})),{date:'2026/10/22',time:'19:00'},'falls back to DateTime');
assert.deepStrictEqual(R.readExifDateTime(jpegWithExif({original:'2026:10:23 07:30:00',modified:'2026:11:01 10:00:00'})),{date:'2026/10/23',time:'07:30'},'DateTimeOriginal wins over DateTime');
/* 讀不到時回 null，不猜 */
assert.strictEqual(R.readExifDateTime(new Uint8Array([0x89,0x50,0x4E,0x47])),null,'not a JPEG');
assert.strictEqual(R.readExifDateTime(new Uint8Array([0xFF,0xD8,0xFF,0xDA,0,2,0xFF,0xD9])),null,'JPEG without EXIF');
assert.strictEqual(R.readExifDateTime(jpegWithExif({original:'0000:00:00 00:00:00'})),null,'blank camera clock');
assert.strictEqual(R.readExifDateTime(jpegWithExif({original:'2026:02:30 10:00:00'})),null,'impossible date');
assert.strictEqual(R.readExifDateTime(new Uint8Array([0xFF,0xD8,0xFF,0xE1,0,40])),null,'truncated segment does not throw');
assert.strictEqual(R.readExifDateTime(new Uint8Array(0)),null);

/* 對應鍵：編輯後指回原紀錄、多品項共用 batchId、其餘用自己的 id */
assert.strictEqual(R.entryKey({id:'a'}),'a');
assert.strictEqual(R.entryKey({id:'b',batchId:'batch-1'}),'batch-1');
assert.strictEqual(R.entryKey({id:'c',batchId:'batch-2',replacesRecordId:'a'}),'a');
assert.strictEqual(R.entryKey(null),'');

/* 連結表：最多 3 張、去重、存檔時搬到新的對應鍵 */
assert.deepStrictEqual(R.normalizeLinks({a:['p1','p1','p2','p3','p4'],'':['x'],b:[],c:'bad'}),{a:['p1','p2','p3']});
let links=R.relink({},[],['batch-1'],['p1','p2']);
assert.deepStrictEqual(links,{'batch-1':['p1','p2']});
assert.deepStrictEqual(R.photosFor(links,{id:'r2',batchId:'batch-1'}),['p1','p2'],'every item of the receipt shows the photos');
links=R.relink(links,['batch-1'],['r1'],['p2']);
assert.deepStrictEqual(links,{r1:['p2']},'edit moves the photos to the new key and drops the removed one');
links=R.relink(links,['r1'],['r1'],[]);
assert.deepStrictEqual(links,{},'removing every photo removes the link');
assert.deepStrictEqual(R.forgetKeys({a:['p1'],b:['p2']},['a']),{b:['p2']});
assert.deepStrictEqual(Object.keys(R.referencedPhotoIds({a:['p1'],b:['p2','p1']},['p9'])).sort(),['p1','p2','p9']);

assert.strictEqual(R.MAX_PHOTOS,3);
assert.notStrictEqual(R.DB_NAME,'trip-local-media','receipts use their own database so shopping orphan cleanup never touches them');

console.log('ledger receipts tests passed');
