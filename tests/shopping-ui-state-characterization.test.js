const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const html=fs.readFileSync('shell/v111/index.html','utf8');

function extractFunction(source,name){
  const start=source.indexOf('function '+name+'(');
  assert(start>=0,name+' exists');
  let cursor=source.indexOf('{',start),depth=0;
  for(;cursor<source.length;cursor++){
    if(source[cursor]==='{')depth++;
    if(source[cursor]==='}')depth--;
    if(depth===0)return source.slice(start,cursor+1);
  }
  throw new Error('could not extract '+name);
}

function plain(value){return JSON.parse(JSON.stringify(value));}

const items=[
  {id:'pending-a',done:false},
  {id:'pending-b',done:false},
  {id:'done-a',done:true}
];
const events=[];
const shoppingUiState={tab:'pending',selectionMode:false,selected:{},split:{id:'split-a'}};
const sandbox={
  shoppingUiState,
  shoppingListStore:{all(){return items.slice();}},
  renderShoppingListOverlay(){events.push('render');},
  requestAnimationFrame(callback){events.push('animation-frame');callback();},
  document:{
    getElementById(id){
      assert.strictEqual(id,'shoppingSelectAllButton');
      return {focus(){events.push('focus');}};
    }
  },
  openShoppingItemDetail(id){events.push('detail:'+id);}
};

/* Keeps this characterization valid before and after the handlers delegate. */
sandbox.shoppingUiWorkflow={
  dispatch(action){
    events.push('dispatch:'+action.type);
    if(action.type==='set-tab'){
      shoppingUiState.tab=action.tab==='done'?'done':'pending';
      shoppingUiState.split=null;
      shoppingUiState.selectionMode=false;
      shoppingUiState.selected={};
      sandbox.renderShoppingListOverlay();
    }else if(action.type==='toggle-selection-mode'){
      shoppingUiState.selectionMode=!shoppingUiState.selectionMode;
      shoppingUiState.selected={};
      sandbox.renderShoppingListOverlay();
    }else if(action.type==='set-item-selection'){
      if(action.selected)shoppingUiState.selected[action.id]=true;
      else delete shoppingUiState.selected[action.id];
      sandbox.renderShoppingListOverlay();
    }else if(action.type==='toggle-visible-selection'){
      shoppingUiState.selected=sandbox.nextShoppingPageSelection(
        action.ids.map(id=>({id})),shoppingUiState.selected
      );
      sandbox.renderShoppingListOverlay();
      sandbox.requestAnimationFrame(function(){
        const button=sandbox.document.getElementById('shoppingSelectAllButton');
        if(button)button.focus();
      });
    }
  }
};

vm.createContext(sandbox);
[
  'shoppingSelectionControlModel',
  'nextShoppingPageSelection',
  'shoppingCurrentTabItems',
  'setShoppingTab',
  'toggleShoppingSelectionMode',
  'toggleShoppingSelection',
  'toggleShoppingPageSelection',
  'handleShoppingItemBodyClick'
].forEach(name=>vm.runInContext(extractFunction(html,name),sandbox));

sandbox.setShoppingTab('done');
assert.deepStrictEqual(plain(shoppingUiState),{
  tab:'done',selectionMode:false,selected:{},split:null
});

shoppingUiState.tab='pending';
shoppingUiState.split={id:'split-b'};
events.length=0;
sandbox.toggleShoppingSelectionMode();
sandbox.toggleShoppingSelection('pending-a',true);
assert.deepStrictEqual(plain(shoppingUiState.selected),{'pending-a':true});
sandbox.toggleShoppingSelectionMode();
assert.deepStrictEqual(plain(shoppingUiState),{
  tab:'pending',selectionMode:false,selected:{},split:{id:'split-b'}
});

shoppingUiState.selectionMode=true;
events.length=0;
sandbox.toggleShoppingPageSelection();
assert.deepStrictEqual(plain(shoppingUiState.selected),{
  'pending-a':true,'pending-b':true
});
assert(events.indexOf('render')>=0,'select-all renders the list');
assert(events.indexOf('render')<events.indexOf('focus'),'select-all renders before restoring focus');
sandbox.toggleShoppingPageSelection();
assert.deepStrictEqual(plain(shoppingUiState.selected),{});

events.length=0;
sandbox.handleShoppingItemBodyClick('pending-a',{type:'click',stopPropagation(){events.push('stop');}});
assert.strictEqual(shoppingUiState.selected['pending-a'],true,'row-body click toggles selection while selecting');
assert.strictEqual(events.includes('detail:pending-a'),false,'row-body click does not open detail while selecting');

console.log('shopping UI state characterization tests passed');
