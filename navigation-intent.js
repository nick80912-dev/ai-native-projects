(function(root,factory){
  var moduleValue=factory();
  if(typeof module==='object'&&module.exports)module.exports=moduleValue;
  else root.TripNavigationIntent=moduleValue;
})(this,function(){
  var VIEWS={'shopping-list':1,shop:1,today:1,trip:1,split:1};
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
    return isFinite(token)&&token>0?token:1;
  }
  function create(initial){
    initial=initial||{};
    return {nextToken:nextToken(initial.nextToken),pending:initial.pending||null,active:initial.active||null};
  }
  function request(state,intent){
    state=create(state);var token=state.nextToken;
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
