(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TripProgression=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function text(value){return String(value==null?'':value);}
  function truthMap(value){
    var result={};
    if(!value||typeof value!=='object'||Array.isArray(value))return result;
    Object.keys(value).forEach(function(key){if(key&&value[key])result[key]=true;});
    return result;
  }
  function normalizeProgress(value){
    var source=value&&typeof value==='object'?value:{};
    return {done:truthMap(source.done),skip:truthMap(source.skip),autoSkip:truthMap(source.autoSkip)};
  }
  function parseStartMinutes(timeText){
    var times=text(timeText).match(/\d{1,2}\s*:\s*\d{2}/g);
    var match=times&&times.length?times[times.length-1].match(/(\d{1,2})\s*:\s*(\d{2})/):null;
    if(!match)return null;
    var hour=parseInt(match[1],10),minute=parseInt(match[2],10);
    if(isNaN(hour)||isNaN(minute)||hour<0||hour>23||minute<0||minute>59)return null;
    return hour*60+minute;
  }
  function notificationFor(skipped){
    if(!skipped.length)return '';
    var names=skipped.map(function(item){return item.label;}).filter(Boolean).slice(0,2);
    return '已自動略過 '+skipped.length+' 項超時未確認行程'+
      (names.length?'：'+names.join('、')+(skipped.length>2?' 等':''):'');
  }
  function reconcile(input){
    var source=input&&typeof input==='object'?input:{};
    var items=(Array.isArray(source.items)?source.items:[]).filter(function(item){return item&&item.act;});
    var progress=normalizeProgress(source.progress),checks=truthMap(source.checks);
    var remaining=items.filter(function(item){
      var id=text(item.id);
      return !(id&&(progress.done[id]||progress.skip[id]||checks[id]));
    });
    if(!remaining.length)return {
      pick:{item:null,remaining:0,source:'complete'},progress:progress,changed:false,skipped:[],notification:''
    };
    function resultFor(item,kind){
      var itemIndex=items.indexOf(item);
      return {item:item,remaining:remaining.filter(function(candidate){return items.indexOf(candidate)>itemIndex;}).length,source:kind};
    }
    var now=Number(source.nowMinutes),cutoff=-1;
    if(isFinite(now))remaining.forEach(function(item,index){
      var minutes=parseStartMinutes(item.time);if(minutes!==null&&minutes<=now)cutoff=index;
    });
    if(cutoff>=0){
      var blocker=-1;
      remaining.some(function(item,index){
        if(index<=cutoff&&item.clusterController){blocker=index;return true;}
        return false;
      });
      if(blocker>=0)cutoff=blocker;
      var stale=remaining.slice(0,cutoff),skipped=[];
      if(source.isToday===true)stale.forEach(function(item){
        var id=text(item.id).trim();
        if(!id||progress.done[id]||progress.skip[id])return;
        progress.skip[id]=true;progress.autoSkip[id]=true;
        skipped.push({id:id,label:text(item.act||item.place).trim()});
      });
      return {
        pick:resultFor(remaining[cutoff],'time-stale'),progress:progress,changed:skipped.length>0,
        skipped:skipped,notification:notificationFor(skipped)
      };
    }
    var future=remaining.filter(function(item){
      var minutes=parseStartMinutes(item.time);return minutes!==null&&minutes>=now;
    })[0];
    return {
      pick:resultFor(future||remaining[0],future?'time':'order'),progress:progress,
      changed:false,skipped:[],notification:''
    };
  }

  return {reconcile:reconcile,parseStartMinutes:parseStartMinutes};
});
