(function(root,factory){
  var moduleValue=factory();
  if(typeof module==='object'&&module.exports)module.exports=moduleValue;
  else root.TripNavigationIntent=moduleValue;
})(this,function(){
  var VIEWS={'shopping-list':1,shop:1,today:1,trip:1,split:1};
  var MAX_SAFE_TOKEN=9007199254740991;
  function cloneIntent(intent,token){
    var view=String(intent&&intent.view||'');
    if(!Object.prototype.hasOwnProperty.call(VIEWS,view))throw new Error('navigation intent view is invalid:'+view);
    return {
      token:token,view:view,targetId:String(intent.targetId||''),sourceView:String(intent.sourceView||''),
      sourceId:String(intent.sourceId||''),align:intent.align==='center'?'center':'start',announce:String(intent.announce||'')
    };
  }
  function nextToken(value){
    var token=Math.floor(Number(value));
    return isFinite(token)&&token>0&&token<=MAX_SAFE_TOKEN?token:1;
  }
  function retainedToken(intent){
    var token=Number(intent&&intent.token);
    return isFinite(token)&&token>0&&token<=MAX_SAFE_TOKEN&&Math.floor(token)===token?token:0;
  }
  function create(initial){
    initial=initial||{};
    var pending=initial.pending||null,active=initial.active||null,token=nextToken(initial.nextToken);
    var retained=Math.max(retainedToken(pending),retainedToken(active));
    if(retained>=token)token=retained>=MAX_SAFE_TOKEN?MAX_SAFE_TOKEN:retained+1;
    return {nextToken:token,pending:pending,active:active};
  }
  function request(state,intent){
    state=create(state);var token=state.nextToken;
    if(token>=MAX_SAFE_TOKEN)throw new Error('navigation intent token is exhausted');
    return {nextToken:token+1,pending:cloneIntent(intent,token),active:state.active};
  }
  function consume(state,view){
    state=create(state);
    if(!state.pending||state.pending.view!==String(view||''))return {state:state,intent:null};
    return {state:{nextToken:state.nextToken,pending:null,active:state.pending},intent:state.pending};
  }
  function complete(state,token){
    state=create(state);
    if(!state.active||state.active.token!==token)return state;
    return {nextToken:state.nextToken,pending:state.pending,active:null};
  }
  return {create:create,request:request,consume:consume,complete:complete};
});
