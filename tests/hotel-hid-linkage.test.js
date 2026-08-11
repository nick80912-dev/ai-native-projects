const assert=require('assert');
const vm=require('vm');
const {readIndexHtml,extractFunction}=require('./support/source');

const html=readIndexHtml();
const sandbox={DB:{hotels:[
  {hotelId:'H001',name:'Renamed Profile',addr:'Address A'},
  {hotelId:' h002 ',name:'Same Display Name',addr:'Address B'}
]}};

vm.createContext(sandbox);
vm.runInContext(extractFunction(html,'hotelOf')+'\n'+extractFunction(html,'weatherHotelForItem'),sandbox);

assert.strictEqual(sandbox.hotelOf({hotelId:' h001 ',name:'Completely Different'}).addr,'Address A');
assert.strictEqual(sandbox.hotelOf({hotelId:'H002',name:'Renamed Profile'}).addr,'Address B');
assert.strictEqual(sandbox.hotelOf({name:'Renamed Profile'}),null);
assert.strictEqual(sandbox.hotelOf({hotelId:'H999',name:'Renamed Profile'}),null);
assert.strictEqual(sandbox.weatherHotelForItem({}, {kind:'place',p:{hotelId:'H001',name:'Other',tnorm:'hotel'}}).hotelId,'H001');
assert.strictEqual(sandbox.weatherHotelForItem({place:'Renamed Profile'}, {kind:'place',p:{hotelId:'H001',name:'Other',tnorm:'shopping'}}),null);
assert.strictEqual(sandbox.weatherHotelForItem({place:'Renamed Profile'},null),null);
