const assert=require('assert');
const vm=require('vm');
const {readIndexHtml,extractFunction}=require('./support/source');
const html=readIndexHtml();
const city={key:'hiroshima',label:'廣島'};
const now=Date.parse('2026-10-18T10:00:00+09:00');
let clock=now, raw=null, denied=false;
class ClockDate extends Date{static now(){return clock;}}
const sandbox={Date:ClockDate,Intl,console,weatherCacheKey:c=>'trip_weather_'+c.key,appNow:()=>new Date(clock),lsGet:()=>{
  try{if(denied)throw Error('denied');return raw===null?null:JSON.parse(raw);}catch(ignore){return null;}
}};
vm.createContext(sandbox);
for(const name of ['rainChanceFromNow','weatherPresentation','readWeatherEnvelope','getCachedWeather','weatherTravelHint',
  'escapeHtml','escapeHtmlAttr','weatherUpdatedTime','renderTodayWeatherArt','renderTodayWeatherSummary']){
  vm.runInContext(extractFunction(html,name),sandbox);
}
const envelope=(changes={})=>Object.assign({t:now,data:{city:'廣島',temp:0,rain:null,code:1}},changes);
const present=(value,time=now)=>sandbox.weatherPresentation(value,city,time);
assert.equal(present(envelope(),now+10799999).status,'fresh');
const expired=present(envelope(),now+10800000);
assert.equal(expired.status,'expired');
assert.equal(expired.temp,null);assert.equal(expired.rain,null);
assert.equal(expired.updatedAt,now);
assert.equal(present(envelope()).temp,0);
for(const t of [undefined,null,0,-1,'123',NaN,Infinity,now+1]){
  const result=present(envelope({t}));
  assert.equal(result.status,'unavailable');assert.equal(result.updatedAt,null);
}
for(const temp of [null,'',undefined,NaN,Infinity]){
  assert.equal(present(envelope({data:{city:'廣島',temp,rain:0}})).status,'unavailable');
}
assert.equal(present(envelope({data:{city:'岡山',temp:21,rain:0}})).status,'unavailable');
for(const rain of [null,'',undefined,NaN,Infinity,-1,101]){
  const result=present(envelope({data:{city:'廣島',temp:21,rain,code:1}}));
  assert.equal(result.status,'fresh');assert.equal(result.rain,null);
  assert.equal(sandbox.weatherTravelHint(result),'');
  assert(!sandbox.renderTodayWeatherSummary(result).includes('0%'));
  assert(!sandbox.renderTodayWeatherSummary(result).includes('適合出發'));
}
const zero=present(envelope({data:{city:'廣島',temp:0,rain:0,code:1}}));
assert.equal(zero.rain,0);
const markup=sandbox.renderTodayWeatherSummary(zero);
assert(markup.includes('廣島'));assert(markup.includes('0°'));
assert(markup.includes('更新於 10:00'));assert(markup.includes('日本時間'));
assert(markup.includes('0%'));
assert(!sandbox.renderTodayWeatherSummary(expired).includes('0°'));
assert(sandbox.renderTodayWeatherSummary(expired).includes('天氣資料已過期，暫無最新資料'));
const original=envelope();raw=JSON.stringify(original);
const before=raw;
sandbox.getCachedWeather(city);sandbox.getCachedWeather(city);
assert.equal(raw,before,'reads never restamp or mutate storage');
clock=now+10800000;
assert.equal(sandbox.getCachedWeather(city),null);
assert.equal(present(sandbox.readWeatherEnvelope(city),clock).status,'expired');
raw='{broken';assert.equal(sandbox.readWeatherEnvelope(city),null);
denied=true;assert.equal(present(sandbox.readWeatherEnvelope(city)).status,'unavailable');denied=false;
// A cached hourly series is projected anew, without mutating its acquired timestamp.
clock=now;raw=JSON.stringify(envelope({data:{city:'廣島',temp:21,rain:90,hours:{
  time:['2026-10-18T09:00','2026-10-18T12:00'],precipitation_probability:[90,0]
}}}));
assert.equal(sandbox.getCachedWeather(city).rain,0);
assert.equal(JSON.parse(raw).data.rain,90);
assert.equal(JSON.parse(raw).t,now);
assert.equal(sandbox.rainChanceFromNow({time:['invalid'],precipitation_probability:[90]},new Date(now)),null);
assert.equal(sandbox.rainChanceFromNow({time:['2026-10-18T12:00'],precipitation_probability:[NaN]},new Date(now)),null);
console.log('weather freshness projection tests passed');
