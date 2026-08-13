(function(root,factory){
  var moduleValue=factory();
  if(typeof module==='object'&&module.exports)module.exports=moduleValue;
  else root.TripDiagnosticImpact=moduleValue;
})(this,function(){
  function project(entry){
    var message=String(entry&&entry.message||'');
    if(/ledger 增量讀取失敗.*維持 CSV 路徑|ledger 增量讀取逾時/.test(message))return {severity:'degraded',title:'分帳快速同步暫時逾時',impact:'目前仍可使用',fallback:'已改用一般 CSV 同步',raw:message};
    if(/可能未保存/.test(message))return {severity:'action-required',title:message,impact:'請確認資料是否已保存',fallback:'',raw:message};
    if(String(entry&&entry.level||'')==='info')return {severity:'info',title:message,impact:'目前使用不受影響',fallback:'',raw:message};
    return {severity:'degraded',title:message,impact:'請查看原始紀錄',fallback:'',raw:message};
  }
  return {project:project};
});
