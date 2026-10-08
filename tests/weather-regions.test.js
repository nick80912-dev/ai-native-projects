/* tests/weather-regions.test.js — v149 新旅程的天氣地區（ADR 0021，規格 §4 決策 5）
   岡山沿用內建城市清單；新旅程只用試算表「天氣地區」分頁，沒有分頁就不顯示天氣。 */
const assert=require('assert');
const vm=require('vm');
const {readIndexHtml,extractFunction,extractDeclaration}=require('./support/source');

const html=readIndexHtml();
function plain(value){return JSON.parse(JSON.stringify(value));}
function load(sourceKey){
  const values={};
  const context={
    console,isFinite,
    localStorage:{getItem(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:null;},setItem(key,value){values[key]=String(value);},removeItem(key){delete values[key];}},
    currentTripSourceKey(){return sourceKey;},
    isLegacyTripSource(){return sourceKey==='legacy';},
    __values:values
  };
  vm.createContext(context);
  vm.runInContext(extractDeclaration(html,'WEATHER_CITIES'),context);
  for(const name of ['parseCSV','weatherRegionValid','parseWeatherRegionsCsv','readWeatherRegions','weatherCities','weatherCityFromText']){
    vm.runInContext(extractFunction(html,name),context);
  }
  vm.runInContext("var WEATHER_REGIONS_KEY='trip_weather_regions';var WEATHER_REGIONS_MAX=30;",context);
  return context;
}

/* 解析：標題列略過、關鍵字多種分隔、超出日本範圍與重複座標略過 */
{
  const ctx=load('sheet:kyushu-2027');
  const parsed=plain(ctx.parseWeatherRegionsCsv([
    '地區名稱,緯度,經度,關鍵字',
    '福岡,33.5902,130.4017,"天神、博多,中洲"',
    '太宰府,33.5196,130.5345,太宰府天滿宮/九州國立博物館',
    '夏威夷,21.3,-157.8,Honolulu',
    '重複,33.5902,130.4017,',
    '沒座標,,,'
  ].join('\n')));
  assert.deepStrictEqual(parsed.regions.map(region=>region.label),['福岡','太宰府']);
  assert.deepStrictEqual(parsed.regions[0].words,['福岡','天神','博多','中洲'],'the label itself is a keyword; 、 and , both split');
  assert.deepStrictEqual(parsed.regions[1].words,['太宰府','太宰府天滿宮','九州國立博物館']);
  assert.strictEqual(parsed.regions[0].key,'r_33.590_130.402','cache key follows the coordinates, so moving a region never reuses old weather');
  assert.strictEqual(parsed.skipped,3,'out-of-Japan, duplicate and blank coordinates are skipped');
}

/* 岡山：固定清單，不讀試算表清單 */
{
  const ctx=load('legacy');
  ctx.localStorage.setItem('trip_weather_regions',JSON.stringify({version:1,sourceKey:'legacy',regions:[{key:'r_1',label:'福岡',lat:33.59,lon:130.4,words:['福岡']}]}));
  assert.strictEqual(ctx.weatherCities(),ctx.WEATHER_CITIES);
  assert.strictEqual(ctx.weatherCityFromText('岡山駅').key,'okayama');
  assert.strictEqual(ctx.weatherCityFromText('福岡'),null);
}

/* 新旅程：沒有地區清單就不顯示天氣，不用岡山的城市猜 */
{
  const ctx=load('sheet:kyushu-2027');
  assert.deepStrictEqual(plain(ctx.weatherCities()),[]);
  assert.strictEqual(ctx.weatherCityFromText('廣島本通'),null,'a new trip never falls back to the Okayama city list');
  const regions=ctx.parseWeatherRegionsCsv('福岡,33.5902,130.4017,天神').regions;
  ctx.localStorage.setItem('trip_weather_regions',JSON.stringify({version:1,sourceKey:'sheet:kyushu-2027',gid:'123',regions:regions}));
  assert.strictEqual(ctx.weatherCityFromText('天神地下街').label,'福岡');
  ctx.localStorage.setItem('trip_weather_regions',JSON.stringify({version:1,sourceKey:'sheet:other-trip',gid:'123',regions:regions}));
  assert.deepStrictEqual(plain(ctx.weatherCities()),[],'a list saved for another trip is ignored');
  ctx.localStorage.setItem('trip_weather_regions','{broken');
  assert.deepStrictEqual(plain(ctx.weatherCities()),[],'a corrupt list is ignored');
}

/* 接線：同步成功後更新地區清單；清單放在 trip_ key，清除與換旅程時會被移除 */
assert.match(html,/if\(result&&result\.ok&&typeof refreshWeatherRegions==='function'\)refreshWeatherRegions\(\);/);
assert.match(html,/var WEATHER_REGIONS_KEY='trip_weather_regions';/);
assert.match(html,/var cities=typeof weatherCities==='function'\?weatherCities\(\):WEATHER_CITIES;/);

console.log('weather regions tests passed');
