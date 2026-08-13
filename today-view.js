(function(root,factory){
  var moduleValue=factory();
  if(typeof module==='object'&&module.exports)module.exports=moduleValue;
  else root.TripTodayView=moduleValue;
})(this,function(){
  function text(value){return String(value==null?'':value);}
  function visibleStopName(value){
    var chars=Array.from(text(value).trim());
    return chars.length>6?chars.slice(0,6).join('')+'…':chars.join('');
  }
  function shoppingSummary(summary){
    var stopRef=text(summary&&summary.stopRef),stopName=text(summary&&summary.stopName).trim();
    var count=Math.max(0,Number(summary&&summary.count)||0);
    if(!stopRef||!stopName||!count)return null;
    var category=text(summary&&summary.firstCategory).trim()||'未分類';
    return {
      kind:'shopping-summary',
      label:text(summary&&summary.label)||'今日採買',
      stopRef:stopRef,
      stopName:stopName,
      visibleStopName:visibleStopName(stopName),
      category:category,
      count:count,
      remainingCount:Math.max(0,Number(summary&&summary.remainingCount)||0),
      accessible:'開啟'+stopName+'採買：'+category+'，共 '+count+' 項待買'
    };
  }
  function buildModel(input){
    input=input&&typeof input==='object'?input:{};
    if(input.summary)return shoppingSummary(input.summary);
    if(input.generic===true)return {
      kind:'shopping-generic',label:'採買清單',value:'開啟查看 →',stopRef:'',accessible:'開啟採買清單'
    };
    return null;
  }
  function actionFor(target){
    if(!target||(target.kind!=='shopping-summary'&&target.kind!=='shopping-generic'))return null;
    return {type:'open-shopping-list',stopRef:text(target.stopRef)};
  }
  function render(model,helpers){
    if(!model)return '';
    helpers=helpers||{};
    var escapeHtml=helpers.escapeHtml,escapeHtmlAttr=helpers.escapeHtmlAttr;
    if(typeof escapeHtml!=='function'||typeof escapeHtmlAttr!=='function')return '';
    var action=actionFor(model);
    var actionAttr=typeof helpers.actionAttribute==='function'?text(helpers.actionAttribute(action)):'';
    if(model.kind==='shopping-generic')return '<button type="button" class="today-hero-summary-item today-hero-shopping-summary today-hero-shopping-generic"'+
      actionAttr+' aria-label="'+escapeHtmlAttr(model.accessible)+'"><span class="today-hero-summary-label">'+escapeHtml(model.label)+'</span>'+
      '<span class="today-hero-summary-value">'+escapeHtml(model.value)+'</span></button>';
    if(model.kind!=='shopping-summary')return '';
    var categoryPreview='<span class="today-hero-shopping-separator">·</span><span class="today-hero-shopping-category">'+escapeHtml(model.category)+'</span>'+
      (model.remainingCount?'<small class="today-hero-shopping-count">+'+model.remainingCount+'</small>':'');
    return '<button type="button" class="today-hero-summary-item today-hero-shopping-summary" data-shopping-launcher="hero" data-shopping-stop-ref="'+escapeHtmlAttr(model.stopRef)+'"'+
      actionAttr+' aria-label="'+escapeHtmlAttr(model.accessible)+'">'+
      '<span class="today-hero-summary-label">'+escapeHtml(model.label)+'</span>'+
      '<span class="today-hero-summary-value"><span class="today-hero-shopping-stop">'+escapeHtml(model.visibleStopName)+'</span>'+
      categoryPreview+'</span></button>';
  }
  return {buildModel:buildModel,render:render,actionFor:actionFor};
});
