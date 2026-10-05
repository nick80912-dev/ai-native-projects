const assert=require('assert');
const vm=require('vm');
const {readIndexHtml,extractFunction,extractDeclaration}=require('./support/source');
const html=readIndexHtml();
const context={Date,DB:{cfg:{}},appNow:()=>new Date(2026,9,24,12),resolveRef:()=>null,hotelOf:()=>null};
vm.createContext(context);
vm.runInContext(extractDeclaration(html,'WEATHER_CITIES'),context);
for(const name of ['weatherCityFromText','weatherHotelForItem','weatherTextForItem','inferWeatherCity','weatherCityForItem','inferWeatherCityForDay','tripCalendarStamp','tripHasEnded']){
  vm.runInContext(extractFunction(html,name),context);
}

// Breaks: calendar rollover accepting invalid dates, or ignoring the trip year.
for(const [raw,want] of [['2026-10-23',1792713600000],['2024-02-29',1709164800000],['2000-02-29',951782400000],
  ['2026-02-29',null],['2100-02-29',null],['2026-04-31',null],['2026-00-01',null],['2026-13-01',null],['2026-10-00',null],['2026-1-2',null],['',null]]){
  assert.equal(context.tripCalendarStamp(raw),want,raw);
}
context.DB.cfg={startdate:'2026-10-18',enddate:'2026-10-23'};
assert.equal(context.tripHasEnded(),true);
context.DB.cfg.enddate='2026-10-24';assert.equal(context.tripHasEnded(),false);
context.DB.cfg.enddate='2026-02-30';assert.equal(context.tripHasEnded(),false);

// Breaks: route notes/origins overriding the actual destination, or wrong region centres.
for(const [name,label,lat,lon] of [
  ['千光寺山纜車','尾道',34.41667,133.2],['鞆之浦','福山',34.48333,133.36667],
  ['琵琶瀑布','祖谷',33.87513,133.8251],['金刀比羅宮','琴平',34.18333,133.81667],['一鶴 丸亀本店','丸龜',34.28333,133.78333]
]){
  const city=context.weatherCityForItem({place:name,act:'觀光',move:'從岡山開車',note:'住宿在岡山'});
  assert.deepEqual([city.label,city.lat,city.lon],[label,lat,lon]);
}
const unknown={place:'未辨識站',act:'參觀',move:'由岡山出發',note:'晚上回岡山住宿'};
const nearby={place:'廣島城',act:'參觀'};
assert.equal(context.weatherCityForItem(unknown),null);
assert.equal(context.inferWeatherCityForDay({items:[unknown,nearby]},unknown).label,'廣島');
assert.equal(context.inferWeatherCityForDay({items:[unknown]},unknown),null);
assert.equal(context.inferWeatherCityForDay({items:[nearby]},unknown),null,'do not select an unrelated day majority for an absent stop');
const past={place:'岡山',act:'參觀'};
assert.equal(context.inferWeatherCityForDay({items:[past,unknown,nearby]},unknown).label,'岡山','equal itinerary distance uses the previous area');
console.log('Home calendar and weather-region tests passed');
