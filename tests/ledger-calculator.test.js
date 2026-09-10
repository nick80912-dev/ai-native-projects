const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const {extractFunction}=require('./support/source');

const html=fs.readFileSync('shell/v114/index.html','utf8');
const evaluatorSource=extractFunction(html,'evaluateLedgerCalculatorExpression');
const normalizeSource=extractFunction(html,'normalizeLedgerCalculatorExpression');
const amountResultSource=extractFunction(html,'ledgerCalculatorAmountResult');
const targetValueSource=extractFunction(html,'ledgerCalculatorTargetValue');
const targetInputIdSource=extractFunction(html,'ledgerCalculatorTargetInputId');
const applyValueSource=extractFunction(html,'ledgerCalculatorApplyValue');

const parserSandbox={String,Number,Math,isFinite};
vm.createContext(parserSandbox);
vm.runInContext(normalizeSource+'\n'+evaluatorSource,parserSandbox);

function result(expression){
  return JSON.parse(JSON.stringify(parserSandbox.evaluateLedgerCalculatorExpression(expression)));
}

assert.deepStrictEqual(result('1200+380+250'),{ok:true,value:1830,error:''},'continuous additions produce one exact total');
assert.deepStrictEqual(result('2+3*4'),{ok:true,value:14,error:''},'multiplication keeps normal precedence');
assert.deepStrictEqual(result('100÷4＋25'),{ok:true,value:50,error:''},'display operators normalize before evaluation');
assert.deepStrictEqual(result('7/2'),{ok:true,value:3.5,error:''},'the evaluator preserves fractional results for apply-time validation');
assert.deepStrictEqual(result('.5+1.25'),{ok:true,value:1.75,error:''},'decimal literals may begin with a decimal point');
assert.deepStrictEqual(result('0.1+0.2'),{ok:true,value:0.30000000000000004,error:''},'the evaluator preserves the raw decimal result');
assert.deepStrictEqual(result('1.2.3'),{ok:false,value:null,error:'算式格式不正確'},'a number cannot contain two decimal points');
assert.deepStrictEqual(result('10%'),{ok:true,value:0.1,error:''},'a standalone percent becomes a ratio');
assert.deepStrictEqual(result('1000*10%'),{ok:true,value:100,error:''},'multiplication consumes a percent as a ratio');
assert.deepStrictEqual(result('1000/10%'),{ok:true,value:10000,error:''},'division consumes a percent as a ratio');
assert.deepStrictEqual(result('1000+10%'),{ok:true,value:1100,error:''},'addition treats percent as a percentage of the current total');
assert.deepStrictEqual(result('1000-10%'),{ok:true,value:900,error:''},'subtraction treats percent as a percentage of the current total');
assert.deepStrictEqual(result('1000+10%+10%'),{ok:true,value:1210,error:''},'chained additive percents use the running total');
assert.deepStrictEqual(result('10%%'),{ok:false,value:null,error:'百分比格式不正確'},'a percent cannot be applied twice to one operand');
assert.deepStrictEqual(result('10+%'),{ok:false,value:null,error:'百分比格式不正確'},'a percent requires a complete operand');
assert.deepStrictEqual(result('10/0'),{ok:false,value:null,error:'不能除以 0'},'division by zero is explicit');
assert.deepStrictEqual(result('1+'),{ok:false,value:null,error:'算式尚未完成'},'an incomplete expression is rejected');
assert.deepStrictEqual(result('1+a'),{ok:false,value:null,error:'算式包含不支援的內容'},'illegal tokens are rejected');
assert.deepStrictEqual(result('1 2'),{ok:false,value:null,error:'算式格式不正確'},'whitespace cannot silently separate two operands');
assert.deepStrictEqual(result('1+2 3'),{ok:false,value:null,error:'算式格式不正確'},'a later operand is never silently discarded');
assert.deepStrictEqual(result(''),{ok:false,value:null,error:'請輸入算式'},'an empty expression has a stable error');
assert.deepStrictEqual(result('9007199254740991+1'),{ok:false,value:null,error:'結果超出可用範圍'},'unsafe intermediate results stop before precision is lost');

assert.doesNotMatch(evaluatorSource,/\beval\s*\(|\bFunction\s*\(/,'the parser never executes dynamic JavaScript');

const floorSource=extractFunction(html,'ledgerCalculatorFloorValue');
const workflowSandbox={
  String,Number,Math,isFinite,
  ledgerUiState:{draft:{multi:false,amount:'1680',discount:'80',items:[{key:'item-123',amount:'380'}]}},
  ledgerDraftItem(key){return workflowSandbox.ledgerUiState.draft.items.filter(item=>item.key===key)[0];},
  updateLedgerDraftField(field,value){workflowSandbox.ledgerUiState.draft[field]=value;workflowSandbox.fieldUpdates.push([field,value]);},
  updateLedgerDraftItem(key,patch,rerender){
    workflowSandbox.itemUpdates.push([key,patch,rerender]);
    workflowSandbox.ledgerUiState.draft.items=workflowSandbox.ledgerUiState.draft.items.map(item=>item.key===key?Object.assign({},item,patch):item);
    if(rerender===false)workflowSandbox.updateLedgerMultiPreview();
  },
  updateLedgerConversionPreview(){workflowSandbox.conversionUpdates++;},
  updateLedgerMultiPreview(){workflowSandbox.multiUpdates++;},
  fieldUpdates:[],itemUpdates:[],conversionUpdates:0,multiUpdates:0
};
vm.createContext(workflowSandbox);
vm.runInContext(normalizeSource+'\n'+evaluatorSource+'\n'+floorSource+'\n'+amountResultSource+'\n'+targetValueSource+'\n'+targetInputIdSource+'\n'+applyValueSource,workflowSandbox);

function amountResult(expression,allowZero){
  return JSON.parse(JSON.stringify(workflowSandbox.ledgerCalculatorAmountResult(expression,allowZero)));
}

assert.deepStrictEqual(amountResult('1200+380',false),{ok:true,value:1580,rawValue:1580,truncated:false,error:''},'positive integers may be applied unchanged');
assert.deepStrictEqual(amountResult('1512.9',false),{ok:true,value:1512,rawValue:1512.9,truncated:true,error:''},'positive fractional amounts floor only at the apply boundary');
assert.deepStrictEqual(amountResult('0.9',false),{ok:false,value:null,rawValue:0.9,truncated:true,error:'捨去後金額必須大於 0'},'a general amount cannot become zero after flooring');
assert.deepStrictEqual(amountResult('0.9',true),{ok:true,value:0,rawValue:0.9,truncated:true,error:''},'a discount may floor to the existing zero value');
assert.deepStrictEqual(amountResult('5-5',false),{ok:false,value:null,rawValue:0,truncated:false,error:'記帳金額必須大於 0'},'zero ledger amounts are rejected');
assert.deepStrictEqual(amountResult('1-2.2',false),{ok:false,value:null,rawValue:-1.2000000000000002,truncated:false,error:'記帳金額必須大於 0'},'negative ledger amounts are rejected before flooring');
assert.deepStrictEqual(amountResult('9007199254740991+1',false),{ok:false,value:null,rawValue:null,truncated:false,error:'結果超出可用範圍'},'unsafe integers are rejected');
assert.deepStrictEqual(amountResult('5-5',true),{ok:true,value:0,rawValue:0,truncated:false,error:''},'discount retains the existing zero policy');
assert.strictEqual(workflowSandbox.ledgerCalculatorFloorValue(2.9999999999999996),3,'floating noise next to an integer does not lose one unit');
assert.strictEqual(workflowSandbox.ledgerCalculatorFloorValue(2.9),2,'a meaningful fraction is always floored');

const draft=workflowSandbox.ledgerUiState.draft;
assert.strictEqual(workflowSandbox.ledgerCalculatorTargetValue(draft,{type:'single'}),'1680');
draft.multi=true;
assert.strictEqual(workflowSandbox.ledgerCalculatorTargetValue(draft,{type:'item',key:'item-123'}),'380');
assert.strictEqual(workflowSandbox.ledgerCalculatorTargetValue(draft,{type:'discount'}),'80');
assert.strictEqual(workflowSandbox.ledgerCalculatorTargetValue(draft,{type:'item',key:'missing'}),null,'stale item targets do not fall back to another field');
assert.strictEqual(workflowSandbox.ledgerCalculatorTargetInputId({type:'single'}),'ledgerAmount');
assert.strictEqual(workflowSandbox.ledgerCalculatorTargetInputId({type:'item',key:'item-123'}),'ledgerItemAmount_item-123');
assert.strictEqual(workflowSandbox.ledgerCalculatorTargetInputId({type:'discount'}),'ledgerDiscount');

draft.multi=false;
assert.strictEqual(workflowSandbox.ledgerCalculatorApplyValue({type:'single'},1830),true);
assert.deepStrictEqual(workflowSandbox.fieldUpdates.pop(),['amount','1830']);
assert.strictEqual(workflowSandbox.conversionUpdates,1,'single apply refreshes conversion immediately');
workflowSandbox.ledgerUiState.draft.multi=true;
assert.strictEqual(workflowSandbox.ledgerCalculatorApplyValue({type:'item',key:'item-123'},630),true);
assert.deepStrictEqual(JSON.parse(JSON.stringify(workflowSandbox.itemUpdates.pop())),['item-123',{amount:'630'},false]);
assert.strictEqual(workflowSandbox.multiUpdates,1,'item apply refreshes the multi-item total immediately');
assert.strictEqual(workflowSandbox.ledgerCalculatorApplyValue({type:'discount'},100),true);
assert.deepStrictEqual(workflowSandbox.fieldUpdates.pop(),['discount','100']);
assert.strictEqual(workflowSandbox.multiUpdates,2,'multi-item discount apply refreshes the bill total');
const beforeUpdates=workflowSandbox.itemUpdates.length;
assert.strictEqual(workflowSandbox.ledgerCalculatorApplyValue({type:'item',key:'missing'},500),false);
assert.strictEqual(workflowSandbox.itemUpdates.length,beforeUpdates,'a stale item target never writes another item');

const triggerSource=extractFunction(html,'renderLedgerCalculatorTrigger');
const sheetSource=extractFunction(html,'renderLedgerCalculatorSheet');
const openSource=extractFunction(html,'openLedgerCalculator');
const closeSource=extractFunction(html,'closeLedgerCalculator');
const inputSource=extractFunction(html,'inputLedgerCalculatorKey');
const backspaceSource=extractFunction(html,'backspaceLedgerCalculator');
const clearSource=extractFunction(html,'clearLedgerCalculator');
const applySource=extractFunction(html,'applyLedgerCalculator');
const singleFieldSource=extractFunction(html,'renderLedgerSingleItemPrimary');
const multiFieldSource=extractFunction(html,'renderLedgerDraftItem');
const discountSource=extractFunction(html,'renderLedgerTaxFields');

const inputSandbox={
  String,Number,Math,isFinite,
  ledgerCalculatorState:{open:true,target:{type:'single'},expression:'',originalValue:'',result:null,error:'',evaluated:false,sheetScrollTop:0},
  updateLedgerCalculatorDisplay(){}
};
vm.createContext(inputSandbox);
vm.runInContext(inputSource+'\n'+backspaceSource+'\n'+clearSource,inputSandbox);
function inputKey(key){inputSandbox.inputLedgerCalculatorKey(key);return inputSandbox.ledgerCalculatorState.expression;}
function resetInput(){inputSandbox.clearLedgerCalculator();inputSandbox.ledgerCalculatorState.evaluated=false;}

assert.strictEqual(inputKey('.'),'0.','a leading decimal key starts a valid zero decimal');
assert.strictEqual(inputKey('5'),'0.5');
assert.strictEqual(inputKey('.'),'0.5','the current operand accepts only one decimal point');
resetInput();assert.strictEqual(inputKey('00'),'0','double zero does not create a leading zero run');
resetInput();inputKey('1');inputKey('+');assert.strictEqual(inputKey('.'),'1+0.','a decimal after an operator starts the next operand');
assert.strictEqual(inputKey('5'),'1+0.5');
assert.strictEqual(inputKey('%'),'1+0.5%','percent is retained as one postfix input token');

assert.match(html,/var ledgerCalculatorState=\{open:false,target:null,expression:'',originalValue:'',result:null,error:'',evaluated:false,sheetScrollTop:0\}/,'one transient calculator state owns a data target, equals state, and no DOM reference');

const renderedOverlay={innerHTML:''};
const renderSandbox={
  document:{getElementById(id){return id==='ledgerCalculatorSheet'?renderedOverlay:null;},createElement(){throw new Error('existing overlay should be reused');},body:{appendChild(){}}},
  updateLedgerCalculatorDisplay(){}
};
vm.createContext(renderSandbox);
vm.runInContext(sheetSource,renderSandbox);
renderSandbox.renderLedgerCalculatorSheet();
const sheetMarkup=renderedOverlay.innerHTML;

assert.match(triggerSource,/type="button"/,'calculator trigger is a formal button');
assert.match(triggerSource,/aria-label="'\+escapeHtml\(label\|\|'開啟金額計算機'\)/,'calculator trigger escapes a target-specific accessible name with a stable fallback');
assert.match(triggerSource,/<svg[^>]*aria-hidden="true"/,'calculator trigger uses the shared monochrome line SVG style');
assert.match(singleFieldSource,/ledger-amount-field-head[\s\S]*renderLedgerCalculatorTrigger\(\{type:'single'/,'single amount places the trigger in the label row');
assert.match(multiFieldSource,/renderLedgerCalculatorTrigger\(\{type:'item',key:item\.key\}/,'every dynamic item amount receives the same trigger renderer');
assert.match(discountSource,/renderLedgerCalculatorTrigger\(\{type:'discount'/,'discount receives the same trigger renderer');
assert.doesNotMatch(discountSource,/ledgerCustomTaxRate[\s\S]{0,300}renderLedgerCalculatorTrigger/,'tax rate never receives a calculator trigger');

assert.match(sheetMarkup,/role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="ledgerCalculatorTitle"/,'calculator is an accessible modal sheet');
assert.match(sheetMarkup,/aria-live="polite"/,'result and validation updates are announced');
assert.match(sheetMarkup,/ledger-calculator-result" aria-live="polite"/,'valid result changes have their own polite live region');
assert.match(sheetMarkup,/計算金額/,'calculator uses the approved compact title');
assert.match(sheetMarkup,/aria-label="關閉金額計算機"/,'calculator has an explicit top-right close control');
assert.match(sheetMarkup,/取消[\s\S]*套用金額/,'calculator offers explicit cancel and apply actions');
assert.match(sheetMarkup,/data-calculator-key="%"[\s\S]*>AC<[\s\S]*aria-label="退格"[\s\S]*data-calculator-key="\/"/,'keypad begins with percent, AC, backspace, and divide');
assert.match(sheetMarkup,/data-calculator-key="\."[\s\S]*data-calculator-key="0"[\s\S]*data-calculator-key="00"[\s\S]*data-calculator-key="="/,'keypad ends with decimal, zero, double-zero, and equals');
assert.doesNotMatch(sheetSource,/onclick="closeLedgerCalculator\([^)]*\)"[^>]*class="ledger-calculator-overlay/,'the background does not close the calculator');
assert.match(openSource,/activeElement[\s\S]*\.blur\(/,'opening dismisses the native number keyboard');
assert.match(openSource,/sheetScrollTop/,'opening stores the mounted Ledger sheet scroll position');
assert.match(openSource,/setAttribute\('inert',''\)/,'opening makes the background Ledger sheet inoperable');
assert.match(closeSource,/removeAttribute\('inert'\)/,'closing restores the background Ledger sheet');
assert.match(closeSource,/ledgerCalculatorTargetInputId/,'closing resolves a fresh focus target from data');
assert.match(closeSource,/scrollTop=scrollTop/,'closing restores the Ledger sheet position');
assert.match(inputSource,/ledgerCalculatorState\.expression/,'key presses update the single expression state');
assert.match(backspaceSource,/slice\(0,-1\)/,'backspace removes one expression character');
assert.match(clearSource,/expression=''/,'clear resets the expression');
assert.match(applySource,/ledgerCalculatorAmountResult/,'apply uses the shared integer validation');
assert.match(applySource,/ledgerCalculatorApplyValue/,'apply routes through the live draft target');
assert.match(applySource,/closeLedgerCalculator\(true\)/,'successful apply restores the original field focus');

assert.match(html,/\.ledger-calculator-trigger\{[^}]*width:44px[^}]*height:44px/,'calculator trigger has a 44 by 44 CSS touch target');
assert.match(html,/\.ledger-calculator-key\{[^}]*min-height:48px/,'calculator keys have comfortable touch targets');
assert.match(html,/\.ledger-calculator-keys\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,'calculator uses the approved four-column grid');
assert.match(html,/\.ledger-calculator-close\{[^}]*width:44px[^}]*height:44px/,'calculator close control has a 44 by 44 touch target');
assert.match(html,/\.ledger-calculator-overlay\{[^}]*z-index:180/,'calculator sits above the Ledger entry sheet');
assert.doesNotMatch(html,/\beval\s*\(|\bnew Function\s*\(/,'the full runtime does not introduce dynamic evaluation');

const equalsSource=extractFunction(html,'evaluateLedgerCalculator');
vm.runInContext(normalizeSource+'\n'+evaluatorSource+'\n'+equalsSource,inputSandbox);
resetInput();inputKey('1');inputKey('+');inputKey('.');inputKey('5');
assert.strictEqual(inputSandbox.evaluateLedgerCalculator(),true,'equals accepts a complete expression');
assert.strictEqual(inputSandbox.ledgerCalculatorState.evaluated,true,'equals records the evaluated transition');
assert.strictEqual(inputSandbox.ledgerCalculatorState.result,1.5,'equals retains the raw result');
assert.strictEqual(inputSandbox.ledgerCalculatorState.expression,'1+0.5','equals keeps the expression visible');
assert.strictEqual(inputKey('2'),'2','a digit after equals starts a new expression');
assert.strictEqual(inputSandbox.evaluateLedgerCalculator(),true);
assert.strictEqual(inputKey('+'),'2+','an operator after equals continues from the result');

console.log('ledger calculator tests passed');
