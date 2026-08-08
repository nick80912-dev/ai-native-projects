(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TripBuyToLedger=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var LINK_VERSION=1;

  function text(value){return String(value==null?'':value).trim();}
  function timestamp(value,label,required){
    var result=text(value);
    if(!result){if(required)throw new Error(label+'時間不可空白');return '';}
    if(!isFinite(Date.parse(result)))throw new Error(label+'時間格式錯誤');
    return result;
  }
  function allocations(item){return item&&Array.isArray(item.allocations)?item.allocations:[];}
  function safeQuantity(value){return typeof value==='number'&&isFinite(value)&&Math.floor(value)===value&&value>=1&&Number.isSafeInteger(value);}
  function quantityLabel(item){
    var source=item&&typeof item==='object'?item:{};
    if(source.quantity!==undefined&&source.quantity!==null&&safeQuantity(source.quantity)){
      var unit=text(source.unit);
      return unit?String(source.quantity)+' '+unit:String(source.quantity);
    }
    return text(source.legacyQtyText);
  }
  function normalizeLink(source){
    var value=source&&typeof source==='object'?source:{};
    var track=text(value.track);
    if(track!=='personal'&&track!=='shared')throw new Error('記帳關聯軌別錯誤');
    var recordId=text(value.recordId);
    if(!recordId)throw new Error('記帳關聯缺少紀錄 ID');
    return {
      version:LINK_VERSION,
      track:track,
      testMode:value.testMode===true,
      recordId:recordId,
      batchId:text(value.batchId),
      linkedAt:timestamp(value.linkedAt,'記帳關聯建立',true),
      releasedAt:timestamp(value.releasedAt,'記帳關聯解除',false)
    };
  }
  function activeLink(value){
    var links=value&&Array.isArray(value.ledgerLinks)?value.ledgerLinks:[];
    var last=links.length?links[links.length-1]:null;
    return last&&!text(last.releasedAt)?last:null;
  }
  function appendLink(links,link){
    return (Array.isArray(links)?links:[]).map(normalizeLink).concat([normalizeLink(link)]);
  }
  function releaseLink(links,at){
    var list=Array.isArray(links)?links:[];
    if(!activeLink({ledgerLinks:list}))return null;
    var releasedAt=timestamp(at,'記帳關聯解除',true);
    return list.map(function(link,index){
      var normalized=normalizeLink(link);
      if(index!==list.length-1)return normalized;
      normalized.releasedAt=releasedAt;
      return normalizeLink(normalized);
    });
  }
  function replacementFor(records,effective,recordId){
    var direct=effective.filter(function(record){return text(record&&record.replacesRecordId)===recordId;})[0];
    if(direct)return direct;
    var raw=records.filter(function(record){return text(record&&record.id)===recordId;})[0];
    var batchId=text(raw&&raw.batchId);
    if(!batchId)return null;
    var siblings={};
    records.forEach(function(record){if(record&&text(record.batchId)===batchId&&record.id)siblings[record.id]=true;});
    return effective.filter(function(record){var ref=text(record&&record.replacesRecordId);return ref&&siblings[ref];})[0]||null;
  }
  function createDomain(dependencies){
    var deps=dependencies||{};
    if(typeof deps.effectiveRecords!=='function')throw new Error('Buy-to-Ledger domain requires effectiveRecords');

    function resolveLinkState(allocation,context){
      var ctx=context||{},link=activeLink(allocation);
      if(!link){
        var history=allocation&&Array.isArray(allocation.ledgerLinks)?allocation.ledgerLinks:[];
        return {state:'unlinked',reason:history.length?'released':'no-link',activeLink:null,record:null};
      }
      if(!!link.testMode!==!!ctx.testMode)return {state:'unverified',reason:'universe-mismatch',activeLink:link,record:null};
      var scope=link.track==='personal'?ctx.personal:ctx.shared;
      if(!scope)return {state:'unverified',reason:'no-context',activeLink:link,record:null};
      var records=Array.isArray(scope.records)?scope.records:[];
      var raw=records.filter(function(record){return text(record&&record.id)===link.recordId;})[0]||null;
      if(link.track==='personal'){
        if(raw)return {state:'linked',reason:'record-found',activeLink:link,record:raw};
        var personalReplacement=records.filter(function(record){return text(record&&record.replacesRecordId)===link.recordId;})[0];
        if(personalReplacement)return {state:'linked',reason:'replaced',activeLink:link,record:personalReplacement};
        if(!scope.ready)return {state:'unverified',reason:'not-ready',activeLink:link,record:null};
        return {state:'unlinked',reason:'personal-record-missing',activeLink:link,record:null};
      }
      var effective=deps.effectiveRecords(records);
      if(!Array.isArray(effective))effective=[];
      var live=effective.filter(function(record){return text(record&&record.id)===link.recordId;})[0];
      if(live)return {state:'linked',reason:'record-found',activeLink:link,record:live};
      var replacement=replacementFor(records,effective,link.recordId);
      if(replacement)return {state:'linked',reason:'replaced',activeLink:link,record:replacement};
      if(raw)return {state:'unlinked',reason:'tombstoned',activeLink:link,record:null};
      return {state:'unverified',reason:scope.ready?'record-missing':'not-ready',activeLink:link,record:null};
    }

    function inspectItem(item,context){
      var allocationStates=allocations(item).map(function(allocation){
        var resolved=resolveLinkState(allocation,context);
        var locked=resolved.state==='linked'||resolved.state==='unverified';
        return {
          allocationId:allocation.allocationId,
          target:allocation.target,
          quantity:allocation.quantity,
          state:resolved.state,
          reason:resolved.reason,
          activeLink:resolved.activeLink,
          record:resolved.record,
          canEdit:!locked,
          editReason:resolved.state==='linked'?'已記帳':resolved.state==='unverified'?'狀態待確認':''
        };
      });
      var total=allocationStates.length;
      var linked=allocationStates.filter(function(value){return value.state==='linked';}).length;
      var unverified=allocationStates.filter(function(value){return value.state==='unverified';}).length;
      var legacyState=!total?resolveLinkState(item,context):null;
      var state=unverified?'unverified':total&&linked===total?'linked':linked?'partial':legacyState?legacyState.state:'unlinked';
      var label=state==='unverified'?'狀態待確認':state==='linked'?'已記帳':state==='partial'?'記帳 '+linked+'／'+total:'未記帳';
      var splitError='';
      if(!item)splitError='找不到採買項目';
      else if(item.done===true)splitError='已買項目請先移回待買，再進行部分購買';
      else if(state==='unverified')splitError='記帳狀態尚待確認，請先完成同步再拆分';
      else if(state==='linked'||state==='partial')splitError='這筆已建立消費紀錄，無法再拆分';
      var quantityTotal=0,quantitiesValid=total>0;
      allocations(item).forEach(function(allocation){
        if(!safeQuantity(allocation.quantity)){quantitiesValid=false;return;}
        quantityTotal+=allocation.quantity;
        if(!Number.isSafeInteger(quantityTotal))quantitiesValid=false;
      });
      return {
        state:state,label:label,linked:linked,total:total,unverified:unverified,
        allocationStates:allocationStates,
        editPolicy:{allocations:allocationStates.map(function(value){return {allocationId:value.allocationId,canEdit:value.canEdit,reason:value.editReason};})},
        canSplit:!splitError,
        splitError:splitError,
        canOfferPartialPurchase:!!item&&item.done!==true&&state==='unlinked'&&quantitiesValid&&quantityTotal>1
      };
    }

    function prepare(items,context){
      var list=Array.isArray(items)?items:[],sources=[],linked=0,unverified=0;
      list.forEach(function(item){
        inspectItem(item,context).allocationStates.forEach(function(allocationState,index){
          if(allocationState.state==='linked'){linked++;return;}
          if(allocationState.state==='unverified'){unverified++;return;}
          var allocation=allocations(item)[index];
          sources.push({shoppingItemId:item.id,allocationId:allocation.allocationId,item:item,allocation:allocation});
        });
      });
      var reason=!list.length?'empty':unverified?'unverified':!sources.length?'already-linked':'';
      return {ok:!reason,reason:reason,sources:sources,linkedCount:linked,unverifiedCount:unverified,total:sources.length+linked+unverified};
    }

    function prefill(source){
      var item=source.item||{},allocation=source.allocation||{},target=text(allocation.target);
      var hasAllocation=!!source.allocation;
      if(!hasAllocation&&text(item.category)==='代購'&&text(item.buyFor))target=text(item.buyFor);
      var amount=hasAllocation?
        quantityLabel({quantity:allocation.quantity,unit:item.unit,legacyQtyText:item.legacyQtyText}):
        quantityLabel(item);
      var note=amount?'數量：'+amount:'';
      if(!hasAllocation&&text(item.buyFor))note+=(note?' · ':'')+'幫誰買：'+text(item.buyFor);
      return {
        detail:text(item.name),name:text(item.name),amount:'',category:'購物',
        note:note,isProxy:!!target,proxyTarget:target
      };
    }
    function createDraftPlan(sources){
      var list=Array.isArray(sources)?sources:[];
      if(!list.length)throw new Error('沒有可用的採買來源');
      if(list.length===1){
        var source=list[0],seed=prefill(source);
        return {
          mode:'single',seed:seed,
          sourceShoppingItemId:text(source.shoppingItemId),
          sourceShoppingAllocationId:text(source.allocationId)
        };
      }
      return {
        mode:'multi',
        items:list.map(function(source){
          var seed=prefill(source);
          return {
            name:seed.detail,amount:'',category:seed.category,isProxy:seed.isProxy,proxyTarget:seed.proxyTarget,note:seed.note,
            sourceShoppingItemId:text(source.shoppingItemId),sourceShoppingAllocationId:text(source.allocationId)
          };
        })
      };
    }

    function sourceRefs(submissionDraft){
      var draft=submissionDraft||{};
      if(draft.multi)return (draft.items||[]).map(function(item){return {
        shoppingItemId:text(item&&item.sourceShoppingItemId),allocationId:text(item&&item.sourceShoppingAllocationId)
      };});
      var itemId=text(draft.sourceShoppingItemId),allocationId=text(draft.sourceShoppingAllocationId);
      return itemId||allocationId?[{shoppingItemId:itemId,allocationId:allocationId}]:[];
    }

    function planCommit(input){
      var command=input||{},refs=sourceRefs(command.submissionDraft||command.draft);
      var prepared=Array.isArray(command.records)?command.records:[];
      var saved=command.result&&Array.isArray(command.result.records)&&command.result.records.length?command.result.records:prepared;
      var seen={},invalid=false;
      refs.forEach(function(ref){
        var key=ref.shoppingItemId+'\n'+ref.allocationId;
        if(!ref.shoppingItemId||!ref.allocationId||seen[key])invalid=true;
        seen[key]=true;
      });
      if(!refs.length||!saved.length)return {ok:false,status:'degraded',links:[],sourceRefs:refs,records:saved,error:'沒有可對應的採買來源'};
      if(invalid||refs.length!==saved.length)return {ok:false,status:'degraded',links:[],sourceRefs:refs,records:saved,error:'採買來源與消費紀錄無法一一對應'};
      var draft=command.draft||{},linkedAt;
      try{linkedAt=timestamp(command.nowIso,'記帳關聯',true);}
      catch(error){return {ok:false,status:'degraded',links:[],sourceRefs:refs,records:saved,error:error.message||'記帳關聯格式錯誤'};}
      var links;
      try{
        links=refs.map(function(ref,index){
          var record=saved[index]||{};
          return {
            shoppingItemId:ref.shoppingItemId,
            allocationId:ref.allocationId,
            link:normalizeLink({
              track:draft.track,testMode:command.testMode===true,recordId:record.id,
              batchId:record.batchId||draft.batchId||'',linkedAt:linkedAt
            })
          };
        });
      }catch(error){return {ok:false,status:'degraded',links:[],sourceRefs:refs,records:saved,error:error.message||'記帳關聯格式錯誤'};}
      return {ok:true,status:'linked',links:links,sourceRefs:refs,records:saved,error:''};
    }

    return {
      inspectItem:inspectItem,
      prepare:prepare,
      createDraftPlan:createDraftPlan,
      sourceRefs:sourceRefs,
      planCommit:planCommit,
      normalizeLink:normalizeLink,
      appendLink:appendLink,
      releaseLink:releaseLink
    };
  }

  return {createDomain:createDomain};
});
