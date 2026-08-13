const assert=require('assert');
const fs=require('fs');
const path=require('path');

const modulePath=path.join(__dirname,'..','today-view.js');
assert(fs.existsSync(modulePath),'today-view.js exists as the production Today presentation boundary');
const TripTodayView=require(modulePath);

function escapeHtml(value){
  return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escapeHtmlAttr(value){return escapeHtml(value).replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function jsHtmlAttrString(value){
  return String(value==null?'':value).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,'')
    .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function actionAttribute(action){
  if(!action||action.type!=='open-shopping-list')return '';
  if(!action.stopRef)return ' onclick="openShoppingList()"';
  return ' onclick="openShoppingList(\''+jsHtmlAttrString(action.stopRef)+'\',this)"';
}
const helpers={escapeHtml,escapeHtmlAttr,jsHtmlAttrString,actionAttribute};

/* Break caught: a selected future Shopping group loses its compact model, exact destination, or accessible full name. */
const futureInput={summary:{
  label:'順路採買',stopRef:'future',stopName:'Nakayama Farm Heart Sakazu',count:2,
  firstCategory:'未分類',remainingCount:1,items:['SECRET_ONE','SECRET_TWO']
}};
const futureSnapshot=JSON.parse(JSON.stringify(futureInput));
const futureModel=TripTodayView.buildModel(futureInput);
assert.deepStrictEqual(futureModel,{
  kind:'shopping-summary',label:'順路採買',stopRef:'future',stopName:'Nakayama Farm Heart Sakazu',
  visibleStopName:'Nakaya…',category:'未分類',count:2,remainingCount:1,
  accessible:'開啟Nakayama Farm Heart Sakazu採買：未分類，共 2 項待買'
});
assert.deepStrictEqual(futureInput,futureSnapshot,'Today display normalization never mutates the prepared projection');
assert.deepStrictEqual(TripTodayView.actionFor(futureModel),{type:'open-shopping-list',stopRef:'future'});

const futureHtml=TripTodayView.render(futureModel,helpers);
assert.strictEqual(futureHtml,
  '<button type="button" class="today-hero-summary-item today-hero-shopping-summary" data-shopping-launcher="hero" data-shopping-stop-ref="future" onclick="openShoppingList(\'future\',this)" aria-label="開啟Nakayama Farm Heart Sakazu採買：未分類，共 2 項待買">'+
  '<span class="today-hero-summary-label">順路採買</span><span class="today-hero-summary-value"><span class="today-hero-shopping-stop">Nakaya…</span>'+
  '<span class="today-hero-shopping-separator">·</span><span class="today-hero-shopping-category">未分類</span><small class="today-hero-shopping-count">+1</small></span></button>'
);
assert(!futureHtml.includes('SECRET_ONE'),'product names never enter visible or accessible Today Hero HTML');

/* Break caught: an empty category becomes blank copy or mutates the Shopping reminder instead of displaying 未分類. */
const blankInput={summary:{label:'今日採買',stopRef:'future',stopName:'廣島和平紀念資料館',count:1,firstCategory:'',remainingCount:0}};
const blankSnapshot=JSON.parse(JSON.stringify(blankInput));
const blankModel=TripTodayView.buildModel(blankInput);
assert.strictEqual(blankModel.category,'未分類');
assert.strictEqual(blankModel.visibleStopName,'廣島和平紀念…');
assert.strictEqual(blankModel.accessible,'開啟廣島和平紀念資料館採買：未分類，共 1 項待買');
assert.deepStrictEqual(blankInput,blankSnapshot);

/* Break caught: no eligible future projection incorrectly repeats the exact next stop instead of using the generic entry. */
const genericModel=TripTodayView.buildModel({generic:true});
assert.deepStrictEqual(genericModel,{
  kind:'shopping-generic',label:'採買清單',value:'開啟查看 →',stopRef:'',accessible:'開啟採買清單'
});
assert.deepStrictEqual(TripTodayView.actionFor(genericModel),{type:'open-shopping-list',stopRef:''});
assert.strictEqual(TripTodayView.render(genericModel,helpers),
  '<button type="button" class="today-hero-summary-item today-hero-shopping-summary today-hero-shopping-generic" onclick="openShoppingList()" aria-label="開啟採買清單">'+
  '<span class="today-hero-summary-label">採買清單</span><span class="today-hero-summary-value">開啟查看 →</span></button>'
);
assert.strictEqual(TripTodayView.buildModel({generic:false}),null);
assert.strictEqual(TripTodayView.buildModel({summary:null}),null);
assert.strictEqual(TripTodayView.actionFor(null),null);
assert.strictEqual(TripTodayView.render(null,helpers),'');

/* Break caught: prepared text can inject markup or break the inline destination handler. */
const escapedModel=TripTodayView.buildModel({summary:{
  label:'順路採買',stopRef:"stop'quoted",stopName:'<script>alert(1)</script>',count:1,
  firstCategory:'Quoted "Category" <svg/onload=alert(1)>',remainingCount:0
}});
const escapedHtml=TripTodayView.render(escapedModel,helpers);
assert(escapedHtml.includes('data-shopping-stop-ref="stop\'quoted"')===false,'attribute text is escaped');
assert(escapedHtml.includes('data-shopping-stop-ref="stop&#39;quoted"'));
assert(escapedHtml.includes("onclick=\"openShoppingList('stop\\'quoted',this)\""));
assert(!escapedHtml.includes('<script>'));
assert(!escapedHtml.includes('<svg'));
assert(escapedHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));

console.log('Today view module tests passed');
