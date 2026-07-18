const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

function extractFunction(name){
  const start = html.indexOf('function ' + name + '(');
  assert.notStrictEqual(start, -1, name + ' exists');
  let i = html.indexOf('{', start);
  let depth = 0;
  for(; i < html.length; i++){
    if(html[i] === '{') depth++;
    if(html[i] === '}') depth--;
    if(depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('Could not extract ' + name);
}

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext([
  extractFunction('clusterControllerId'),
  extractFunction('getChildStopCluster')
].join('\n'), sandbox);

const groups = [
  ['P001','P048'],
  ['P003','P004','P005','P006'],
  ['P008','P009','P010','P011'],
  ['R008','P014'],
  ['P015','P016','P017','P018'],
  ['P019','P020'],
  ['P023','P024','P025','P026'],
  ['P027','P028','P029','P030'],
  ['P032','P033','P034','P035','P036','P037'],
  ['P038','P039'],
  ['P041','P042'],
  ['P043','P044']
];

groups.forEach(function(refs, groupIndex){
  const items = refs.map(function(ref, itemIndex){
    return {
      id:'g'+groupIndex+'_'+itemIndex,
      time:groupIndex===0?(itemIndex===0?'17:30':'19:30'):(10+itemIndex)+':00',
      act:itemIndex===0?'串點行程':'',
      place:'站點 '+ref,
      ref:ref
    };
  });
  items.push({id:'next_'+groupIndex,time:'23:00',act:'下一段行程',place:'Next'});
  const cluster = sandbox.getChildStopCluster(items, items[0]);
  assert(cluster, 'group '+(groupIndex+1)+' forms a cluster');
  assert.deepStrictEqual(
    Array.from(cluster.items).map(function(item){ return item.ref; }),
    refs,
    'group '+(groupIndex+1)+' keeps every audited ref in order'
  );
  assert.strictEqual(cluster.controllerId, items[0].id+'__cluster');
});

const dayOneItems = [
  {id:'day1_parent',time:'17:30',act:'機場與取車',place:'岡山桃太郎機場',ref:'P001'},
  {id:'day1_child',time:'19:30',act:'',place:'ORIX租車 岡山機場店',ref:'P048'}
];
assert.strictEqual(sandbox.getChildStopCluster(dayOneItems, dayOneItems[0]).items[0].time, '17:30');

console.log('parent first-stop cluster tests passed');
