(function(root,factory){
  var moduleValue=factory();
  if(typeof module==='object'&&module.exports)module.exports=moduleValue;
  else root.TripDiagnosticImpact=moduleValue;
})(this,function(){
  function project(entry){
    var message=String(entry&&entry.message||'');
    if(String(entry&&entry.category||'')==='sync'&&message==='ledger 增量讀取失敗,維持 CSV 路徑:ledger 增量讀取逾時')return {severity:'degraded',title:'分帳快速同步暫時逾時',impact:'目前仍可使用',fallback:'已改用一般 CSV 同步',raw:message};
    /* v152：旅途中最常見的幾則訊息改成白話。只認得確切的寫法；其他分帳增量讀取錯誤（HTTP 403 等）刻意維持原文。 */
    var category=String(entry&&entry.category||'');
    if(category==='repository'&&/^分帳佇列屬於其他旅程（.+），已暫停送出$/.test(message))return {severity:'action-required',title:'待送的分帳屬於其他旅程，已暫停送出',impact:'這些紀錄不會送出，也不會刪除；請截圖給旅程負責人',fallback:'',raw:message};
    if(category==='repository'&&/^分帳送出失敗:[\s\S]* — 已留在本機佇列$/.test(message))return {severity:'degraded',title:'分帳紀錄還沒送出',impact:'紀錄仍在這支手機',fallback:'連上網路後會自動補送',raw:message};
    if(category==='repository'&&/^背景同步失敗：/.test(message))return {severity:'degraded',title:'分帳紀錄背景送出失敗',impact:'紀錄仍在這支手機',fallback:'連上網路後會自動補送',raw:message};
    if(category==='sync'&&message==='ledger 下載失敗 — 沿用目前分帳快照,其餘工作表繼續更新')return {severity:'degraded',title:'分帳紀錄這次沒有下載成功',impact:'分帳暫時顯示上次的資料',fallback:'其他行程資料已更新',raw:message};
    if(category==='sync'&&/^SW 註冊失敗:/.test(message))return {severity:'degraded',title:'離線功能沒有啟用',impact:'沒有網路時可能打不開 App',fallback:'連網重新開啟 App 會再試一次',raw:message};
    if(category==='data'&&message==='天氣讀取未完成；可於首頁重試。')return {severity:'degraded',title:'天氣暫時讀不到',impact:'不影響行程與分帳',fallback:'可於首頁重試',raw:message};
    if(category==='data'&&message==='天氣快取未能保存；目前資料僅在本次開啟期間可用。')return {severity:'degraded',title:'天氣資料沒有存到手機',impact:'重新開啟 App 後要再讀一次天氣',fallback:'',raw:message};
    if(/可能未保存/.test(message))return {severity:'action-required',title:message,impact:'請確認資料是否已保存',fallback:'',raw:message};
    if(String(entry&&entry.level||'')==='info')return {severity:'info',title:message,impact:'目前使用不受影響',fallback:'',raw:message};
    return {severity:'degraded',title:message,impact:'請查看原始紀錄',fallback:'',raw:message};
  }
  return {project:project};
});
