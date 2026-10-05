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
for(const missing of [null,'',undefined]){
  const futureUnknown=present(envelope({data:{city:'廣島',temp:21,code:1,hours:{
    time:['2026-10-18T09:00','2026-10-18T12:00','2026-10-18T13:00'],precipitation_probability:[0,missing,missing]
  }}}));
  assert.equal(futureUnknown.rain,null,'past zero must not substitute for missing future rainfall');
  assert.equal(futureUnknown.temp,21);
  const futureMarkup=sandbox.renderTodayWeatherSummary(futureUnknown);
  assert(futureMarkup.includes('降雨機率未知'));
  assert(!futureMarkup.includes('0%'));assert(!futureMarkup.includes('適合出發'));
}
console.log('weather freshness projection tests passed');

function requestFixture(){
  let time=now,active=true,writeDenied=false,renders=0;
  const storage=new Map(),pending=[],logs=[];
  class RequestDate extends Date{static now(){return time;}}
  const context={Date:RequestDate,Intl,Promise,console,homeWeatherState:{},homeWeatherEpoch:0,homeWeatherRequestId:0,
    homeWeatherVisibleKey:null,curView:'today',DB:{trip:{days:[{items:[]}]},},appNow:()=>new Date(time),
    TripLifecycle:{readState:()=>({mode:active?'active':'inactive'})},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>{
      if(writeDenied)throw Error('QUOTA_PRIVATE_PAYLOAD');storage.set(key,value);
    }},
    AppLog:{data:message=>logs.push(message),repo:message=>logs.push(message)},
    inferWeatherCityForDay:(day,item)=>item.city,
    paintHomeWeather:()=>{renders++;},homeWeatherExpiryTimer:null,setTimeout:()=>1,clearTimeout:()=>{},
    document:{activeElement:null,querySelector:()=>null},
    fetchWithTimeout:(url,timeout)=>{assert.equal(timeout,6500);return new Promise((resolve,reject)=>pending.push({url,resolve,reject}));}
  };
  context.lsGet=key=>{try{return JSON.parse(context.localStorage.getItem(key));}catch(ignore){return null;}};
  context.lsSet=(key,value)=>{try{context.localStorage.setItem(key,JSON.stringify(value));}catch(ignore){}};
  vm.createContext(context);
  for(const name of ['weatherCacheKey','weatherIcon','rainChanceFromNow','weatherPresentation','readWeatherEnvelope','getCachedWeather',
    'setCachedWeather','fetchWeather','loadWeatherEnvelope','loadWeatherForCity','requestHomeWeather','homeWeatherFor',
    'refreshHomeWeather','cancelHomeWeatherExpiry','scheduleHomeWeatherExpiry','revalidateHomeWeather','weatherDiagnostic','weatherTripActive']){
    if(html.includes('function '+name+'('))vm.runInContext(extractFunction(html,name),context);
  }
  const item={city},other={city:{key:'okayama',label:'岡山',lat:34,lon:133}};
  function reply(index,temp=21,rain=null){pending[index].resolve({ok:true,json:()=>Promise.resolve({
    current:{temperature_2m:temp,weather_code:1},hourly:{time:['2026-10-18T20:00'],precipitation_probability:[rain]}
  })});}
  return {context,storage,pending,logs,item,other,reply,get renders(){return renders;},
    advance:ms=>{time+=ms;},clear:()=>{active=false;context.homeWeatherEpoch++;context.homeWeatherState={};storage.clear();},
    deny:()=>{writeDenied=true;},tick:()=>new Promise(resolve=>setImmediate(resolve))};
}
(async()=>{
  const cached=requestFixture();cached.storage.set('trip_weather_hiroshima',JSON.stringify(envelope()));
  cached.context.homeWeatherFor(0,cached.item);cached.context.requestHomeWeather(0,cached.item);
  assert.equal(cached.pending.length,0,'valid cache avoids fetch');
  cached.advance(10800000);
  assert.equal(cached.context.homeWeatherFor(0,cached.item).status,'expired');
  cached.context.requestHomeWeather(0,cached.item);cached.context.requestHomeWeather(0,cached.item);
  assert.equal(cached.pending.length,1,'expired session triggers exactly one refresh');
  cached.pending[0].reject(Error('network'));await cached.tick();
  cached.context.requestHomeWeather(0,cached.item);assert.equal(cached.pending.length,1,'failed re-render never auto retries');
  cached.context.requestHomeWeather(0,cached.item,true);assert.equal(cached.pending.length,2,'manual retry starts one request');
  cached.context.requestHomeWeather(0,cached.item,true);assert.equal(cached.pending.length,2,'even force cannot duplicate loading request');
  cached.reply(1,0,0);await cached.tick();
  assert.equal(cached.context.homeWeatherFor(0,cached.item).temp,0);
  assert.equal(cached.context.homeWeatherFor(0,cached.item).rain,0);
  const saved=JSON.parse(cached.storage.get('trip_weather_hiroshima')).t;
  await cached.context.loadWeatherForCity(city);
  assert.equal(JSON.parse(cached.storage.get('trip_weather_hiroshima')).t,saved,'data wrapper retains acquired time');
  const denied=requestFixture();denied.deny();denied.context.homeWeatherFor(0,denied.item);
  denied.context.requestHomeWeather(0,denied.item);denied.reply(0,22,null);await denied.tick();
  assert.equal(denied.context.homeWeatherFor(0,denied.item).temp,22,'valid network survives denied cache write');
  assert.equal(denied.storage.size,0);assert(denied.logs.some(line=>line.includes('天氣快取')));
  assert(!denied.logs.join('').includes('PRIVATE_PAYLOAD'),'diagnostics omit raw exceptions');
  const clear=requestFixture();clear.context.homeWeatherFor(0,clear.item);clear.context.requestHomeWeather(0,clear.item);
  clear.clear();clear.reply(0);await clear.tick();
  assert.equal(clear.storage.size,0,'late response cannot resurrect cleared cache');
  assert.equal(Object.keys(clear.context.homeWeatherState).length,0);assert.equal(clear.renders,0);
  const cities=requestFixture();cities.context.homeWeatherFor(0,cities.item);cities.context.requestHomeWeather(0,cities.item);
  cities.context.homeWeatherFor(0,cities.other);cities.context.requestHomeWeather(0,cities.other);
  cities.reply(1,25,0);await cities.tick();cities.reply(0,10,90);await cities.tick();
  assert.equal(cities.context.homeWeatherFor(0,cities.other).temp,25);assert.equal(cities.renders,1,'old city never re-renders current city');
  assert.equal(cities.context.homeWeatherFor(0,cities.item).temp,10);
  const leave=requestFixture();leave.context.homeWeatherFor(0,leave.item);leave.context.requestHomeWeather(0,leave.item);
  leave.context.curView='trip';leave.reply(0);await leave.tick();assert.equal(leave.renders,0,'off-page replies do not render');
  assert.equal(leave.context.homeWeatherFor(0,leave.item).status,'fresh','off-page result can be reused while active');
  console.log('weather session / requests / failure guard tests passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
