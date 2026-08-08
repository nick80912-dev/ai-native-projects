const assert=require('assert');
const vm=require('vm');
const {readIndexHtml,extractFunction}=require('./support/source');

const html=readIndexHtml();
const sandbox={
  encodeURIComponent,
  Number,
  String,
  isFinite,
  DB:{trip:{days:[
    {items:[{id:'day-1-generic',act:'採買',place:'AEON'}]},
    {items:[{id:'day-2-exact',act:'午餐',place:'一鶴 高松店'}]}
  ]}},
  transport(){return 'drive';}
};
vm.createContext(sandbox);
vm.runInContext([
  extractFunction(html,'navigationIntent'),
  extractFunction(html,'navigationDirectionsUrl'),
  extractFunction(html,'tripItemForNavigation')
].join('\n'),sandbox);

const exactPlace=sandbox.navigationIntent(
  {id:'p',act:'購物',place:'永旺'},
  {kind:'place',p:{placeId:'P001',name:'永旺夢樂城 岡山'}}
);
assert.deepStrictEqual(JSON.parse(JSON.stringify(exactPlace)),{
  kind:'exact',query:'永旺夢樂城 岡山'
},'a resolved Places row is an exact navigation intent');
assert.strictEqual(
  sandbox.navigationDirectionsUrl(exactPlace),
  'https://www.google.com/maps/dir/?api=1&destination=%E6%B0%B8%E6%97%BA%E5%A4%A2%E6%A8%82%E5%9F%8E%20%E5%B2%A1%E5%B1%B1%20%E6%97%A5%E6%9C%AC&travelmode=driving',
  'exact Places navigation keeps the Japan disambiguator and never invents an origin'
);

const exactRestaurant=sandbox.navigationIntent(
  {id:'r',act:'午餐',place:'一鶴'},
  {kind:'rest',r:{restId:'R001',name:'一鶴 高松店'}}
);
assert.deepStrictEqual(JSON.parse(JSON.stringify(exactRestaurant)),{
  kind:'exact',query:'一鶴 高松店'
},'a resolved restaurant is exact even when the itinerary display is shorter');

const nearby=sandbox.navigationIntent({id:'g',act:'採買',place:'AEON\n候選分店'},null);
assert.deepStrictEqual(JSON.parse(JSON.stringify(nearby)),{kind:'nearby',query:'AEON'},'an unresolved first-line name requests nearby resolution');
assert.strictEqual(
  sandbox.navigationDirectionsUrl(nearby,{latitude:34.6651,longitude:133.918}),
  'https://www.google.com/maps/dir/?api=1&origin=34.6651%2C133.918&destination=AEON&travelmode=driving',
  'valid current coordinates become the explicit route origin'
);
assert.strictEqual(
  sandbox.navigationDirectionsUrl(nearby),
  'https://www.google.com/maps/dir/?api=1&destination=AEON%20%E6%97%A5%E6%9C%AC&travelmode=driving',
  'missing location falls back to the existing name plus Japan route'
);
assert.strictEqual(
  sandbox.navigationDirectionsUrl(nearby,{latitude:NaN,longitude:133.918}),
  'https://www.google.com/maps/dir/?api=1&destination=AEON%20%E6%97%A5%E6%9C%AC&travelmode=driving',
  'invalid coordinates never leak into a Maps URL'
);

sandbox.transport=()=> 'transit';
assert.strictEqual(
  sandbox.navigationDirectionsUrl(nearby,{latitude:35,longitude:139}),
  'https://www.google.com/maps/dir/?api=1&origin=35%2C139&destination=AEON&travelmode=transit',
  'transit mode uses the same nearby-origin contract'
);

assert.strictEqual(sandbox.tripItemForNavigation(0,'day-1-generic').place,'AEON','the click handler resolves the exact rendered day item');
assert.strictEqual(sandbox.tripItemForNavigation(9,'missing'),null,'missing days degrade without throwing');
assert.strictEqual(sandbox.tripItemForNavigation(0,'missing'),null,'missing item IDs degrade without guessing');
assert.strictEqual(sandbox.navigationIntent({act:'',place:''},null),null,'items without a destination render no navigation intent');

console.log('navigation location tests passed');
