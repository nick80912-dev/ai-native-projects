const assert=require('assert');
const fs=require('fs');

const html=fs.readFileSync('shell/v113/index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');

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

const scriptTag='<script src="shopping-ui-state.js"></script>';
assert(html.includes(scriptTag),'Shopping UI state module is loaded by the runtime');
assert(html.indexOf(scriptTag)<html.indexOf('var shoppingUiState='),'Shopping UI state module loads before the inline App');
assert(sw.includes("'./shopping-ui-state.js'"),'Shopping UI state module belongs to the offline App Shell');
assert.match(html,/var shoppingUiWorkflow=TripShoppingUiState\.createWorkflow\(\{/,'production uses the tested workflow seam');

const adapterStart=html.indexOf('var shoppingUiWorkflow=');
const adapterEnd=html.indexOf('var shoppingPhotoStore=',adapterStart);
assert(adapterStart>=0&&adapterEnd>adapterStart,'Shopping UI projection adapter has a bounded production section');
const adapter=html.slice(adapterStart,adapterEnd);
assert.match(adapter,/readState:function\(\)\{return \{tab:shoppingUiState\.tab,selectionMode:shoppingUiState\.selectionMode,selected:shoppingUiState\.selected,form:shoppingUiState\.form,formSession:shoppingUiState\.formSession,photoError:shoppingUiState\.photoError\};\}/,'adapter reads the complete Shopping workflow projection');
assert.match(adapter,/writeState:function\(next\)\{shoppingUiState\.tab=next\.tab;shoppingUiState\.selectionMode=next\.selectionMode;shoppingUiState\.selected=next\.selected;shoppingUiState\.form=next\.form;shoppingUiState\.formSession=next\.formSession;shoppingUiState\.photoError=next\.photoError;\}/,'adapter alone writes the complete Shopping workflow projection');
assert.doesNotMatch(adapter,/shoppingListStore|shoppingPhotoStore|buyToLedger|localStorage/,'adapter does not absorb repositories or domain decisions');

const expectedActions={
  setShoppingTab:'set-tab',
  toggleShoppingSelectionMode:'toggle-selection-mode',
  toggleShoppingSelection:'set-item-selection',
  toggleShoppingPageSelection:'toggle-visible-selection'
};
Object.keys(expectedActions).forEach(function(name){
  const source=extractFunction(html,name),action=expectedActions[name];
  assert(source.includes("shoppingUiWorkflow.dispatch({type:'"+action+"'"),name+' dispatches '+action);
  assert.doesNotMatch(source,/shoppingUiState\.(?:tab|selectionMode|selected)\s*=(?!=)/,name+' does not directly replace owned state');
  assert.doesNotMatch(source,/delete shoppingUiState\.selected/,name+' does not directly delete owned state');
});

const openSource=extractFunction(html,'openShoppingList');
assert.match(openSource,/document\.body\.appendChild\(overlay\)[\s\S]*shoppingUiWorkflow\.dispatch\(\{type:'open-list'\}\)/,'list mounts before open-list renders through the workflow');
assert.doesNotMatch(openSource,/shoppingUiState\.(?:tab|selectionMode|selected)\s*=(?!=)/,'open-list no longer directly resets owned fields');

['completeSelectedShopping','openBuyToLedgerDraft','moveSelectedShoppingBackToPending','deleteSelectedShoppingItems'].forEach(function(name){
  const source=extractFunction(html,name);
  assert.match(source,/shoppingUiWorkflow\.dispatch\(\{type:'reset-selection'\}\)/,name+' resets selection through the seam on success');
  assert.doesNotMatch(source,/shoppingUiState\.(?:tab|selectionMode|selected)\s*=(?!=)/,name+' does not directly reset owned state');
});

const deleteSource=extractFunction(html,'deleteShoppingItem');
assert.match(deleteSource,/shoppingUiWorkflow\.dispatch\(\{type:'prune-selection',ids:\[id\]\}\)/,'single delete prunes selection through the seam');
assert.doesNotMatch(deleteSource,/delete shoppingUiState\.selected/,'single delete does not directly mutate the selection map');

['openShoppingItemDetail','openShoppingPhotoViewer','openShoppingPhotoRepair'].forEach(function(name){
  assert.doesNotMatch(extractFunction(html,name),/shoppingUiWorkflow/,'unowned '+name+' remains outside the list selection seam');
});
assert.match(extractFunction(html,'openShoppingForm'),/shoppingUiWorkflow\.dispatch\(\{type:'open-form'/,'form open uses the shared Shopping workflow');
assert.match(extractFunction(html,'cancelShoppingForm'),/shoppingUiWorkflow\.dispatch\(\{type:'close-form'/,'form cancel uses the shared Shopping workflow');
assert.match(extractFunction(html,'commitShoppingFormPayload'),/type:'form-save-requested'/,'form persistence is guarded by a workflow request');
assert.match(extractFunction(html,'commitShoppingFormPayload'),/type:'form-save-succeeded'/,'form success returns through the workflow');
assert.match(extractFunction(html,'selectShoppingPhoto'),/type:'photo-save-requested'/,'photo persistence is guarded by a workflow request');
assert.match(extractFunction(html,'selectShoppingPhoto'),/type:'photo-save-succeeded'/,'photo completion returns through the workflow');
assert.doesNotMatch(extractFunction(html,'personalStateJson'),/shoppingUiState|shoppingUiWorkflow/,'personal backups exclude Shopping UI state');
assert.doesNotMatch(extractFunction(html,'applyPersonalStatePayload'),/shoppingUiState|shoppingUiWorkflow/,'personal restores exclude Shopping UI state');

const ownedAssignments=html.match(/shoppingUiState\.(?:tab|selectionMode|selected)\s*=(?!=)/g)||[];
assert.strictEqual(ownedAssignments.length,3,'only the projection adapter directly assigns the three owned fields');
const formOwnedAssignments=html.match(/shoppingUiState\.(?:form|formSession|photoError)\s*=(?!=)/g)||[];
assert.strictEqual(formOwnedAssignments.length,3,'only the projection adapter directly assigns form-owned fields');
assert.doesNotMatch(html,/delete shoppingUiState\.selected/,'owned selection maps are never mutated outside the module projection');

console.log('shopping UI state wiring tests passed');
