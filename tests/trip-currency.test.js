/* v168（backlog #62）：旅程幣別 —— 最小單位、輸入解析、顯示，以及日圓的格式與換算和以前一模一樣 */
const assert=require('assert');
const C=require('../trip-currency.js');

/* 日圓（岡山）與以前完全相同 */
assert.strictEqual(C.format(1500,'JPY'),'¥'+Math.round(1500).toLocaleString());
assert.strictEqual(C.format(-1500,'JPY'),'¥'+Math.round(-1500).toLocaleString(),'negative amounts keep the old ¥-1,500 shape');
assert.strictEqual(C.format(315,'TWD'),'NT$'+(315).toLocaleString());
assert.strictEqual(C.toMinor(1500,'JPY'),1500);
assert.strictEqual(C.toMajor(1500,'JPY'),1500);
assert.strictEqual(C.localMinorToHome(3000,'JPY',0.21),Math.round(3000*0.21),'JPY → TWD same as before');
assert.strictEqual(C.homeToLocalMinor(630,'JPY',0.21),Math.round(630/0.21),'TWD → JPY same as before');
assert.strictEqual(C.parseInput('1500','JPY'),1500);
assert.ok(isNaN(C.parseInput('12.5','JPY')),'yen has no decimals');
assert.strictEqual(C.inputText(1500,'JPY'),'1500');

/* 有小數的幣別記到分 */
assert.strictEqual(C.decimals('USD'),2);
assert.strictEqual(C.parseInput('12.50','USD'),1250);
assert.strictEqual(C.parseInput('12.5','USD'),1250);
assert.strictEqual(C.parseInput('12','USD'),1200);
assert.ok(isNaN(C.parseInput('12.505','USD')),'no more than two decimals');
assert.ok(isNaN(C.parseInput('-3','USD')));
assert.ok(isNaN(C.parseInput('abc','USD')));
assert.ok(isNaN(C.parseInput('1,234.56','USD')),'typed amounts take no thousands separators, same as before');
assert.strictEqual(C.toMinor('12.5','USD'),1250,'Sheet value 12.5 is 1250 cents');
assert.strictEqual(C.toMinor(0.1+0.2,'USD'),30,'floating point is rounded to the cent');
assert.strictEqual(C.toMajor(1250,'USD'),12.5);
assert.strictEqual(C.inputText(1250,'USD'),'12.50');
assert.strictEqual(C.format(1250,'USD'),'US$'+(12.5).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}));
assert.strictEqual(C.localMinorToHome(1250,'USD',32.1),Math.round(12.5*32.1),'US$12.50 → NT$401');
assert.strictEqual(C.homeToLocalMinor(401,'USD',32.1),Math.round(401/32.1*100),'NT$401 → cents');

/* 沒有小數的其他幣別 */
assert.strictEqual(C.format(12000,'KRW'),'₩'+(12000).toLocaleString());
assert.strictEqual(C.localMinorToHome(12000,'KRW',0.024),288);

/* 代碼與資料 */
assert.strictEqual(C.normalizeCode(' krw '),'KRW');
assert.strictEqual(C.normalizeCode('KR'),'');
assert.strictEqual(C.normalizeCode('日幣'),'');
assert.strictEqual(C.info('').code,'JPY','blank Currency means JPY (Okayama)');
assert.deepStrictEqual(C.info('THB'),{code:'THB',name:'泰銖',symbol:'฿',decimals:2});
const unknown=C.info('ISK');
assert.strictEqual(unknown.name,'ISK','unlisted currencies use their code as the name');
assert.ok(unknown.decimals>=0&&unknown.decimals<=3);
assert.strictEqual(C.HOME,'TWD','settlement is always TWD (Bar 2026-10-31)');
assert.strictEqual(C.info('JPY').name,'日幣','Okayama keeps the 日幣 wording');

/* v169 稅每趟自己設定(Bar 2026-10-31) */
assert.deepStrictEqual(C.taxSettings({}),{enabled:true,rates:[10,8],defaultRate:10,priceMode:'included',taxFree:true,japaneseLabels:true},'Okayama (JPY, nothing filled) keeps 10%/8%, 含稅 and 免稅品');
assert.deepStrictEqual(C.taxSettings({currency:'KRW'}),{enabled:false,rates:[],defaultRate:0,priceMode:'included',taxFree:false,japaneseLabels:false},'other currencies show no tax by default');
assert.deepStrictEqual(C.taxSettings({currency:'THB',taxRates:'7%',taxPriceMode:'未稅',taxFree:'yes'}),{enabled:true,rates:[7],defaultRate:7,priceMode:'excluded',taxFree:true,japaneseLabels:false});
assert.strictEqual(C.taxSettings({taxRates:'0'}).enabled,false,'0 turns tax off, even for JPY');
assert.strictEqual(C.taxSettings({taxRates:'0',taxFree:'yes'}).taxFree,false,'no tax-free option without tax rates');
assert.strictEqual(C.taxSettings({taxRates:' 8，10 '}).defaultRate,8,'the first listed rate is the default');
assert.strictEqual(C.taxSettings({taxFree:'no'}).taxFree,false,'a JPY trip may turn tax-free off');
assert.deepStrictEqual(C.parseTaxRates('10,8,10,abc,8.875,101,5.5'),[10,8,5.5],'bad, repeated and out-of-range rates are skipped');
assert.strictEqual(C.parsePriceMode('税抜'),'excluded');
assert.strictEqual(C.parsePriceMode('Included'),'included');
assert.strictEqual(C.parsePriceMode('看情況'),'');
assert.strictEqual(C.parseYesNo('是'),true);
assert.strictEqual(C.parseYesNo('maybe'),null);

console.log('trip currency tests passed');
