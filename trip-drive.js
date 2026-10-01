(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TripDrive=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var BASE='https://www.googleapis.com/drive/v3';
  var UPLOAD='https://www.googleapis.com/upload/drive/v3/files';
  var SCOPE='https://www.googleapis.com/auth/drive.file';
  function escapeQuery(value){return String(value).replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
  function propertyQuery(properties){
    return Object.keys(properties).map(function(key){
      return "appProperties has { key='"+escapeQuery(key)+"' and value='"+escapeQuery(properties[key])+"' }";
    }).join(' and ');
  }
  function createClient(options){
    if(!options||typeof options.fetch!=='function'||typeof options.requestAccessToken!=='function')throw new Error('Drive dependencies are required');
    var fetchFn=options.fetch,token=null,expiresAt=0,currentAccount=null,folderId=null,generation=0,noteFlights={};
    function forget(){generation++;token=null;expiresAt=0;currentAccount=null;folderId=null;}
    function validToken(){
      if(!token||Date.now()>=expiresAt){forget();throw new Error('Google authorization expired; connect again');}
      return token;
    }
    function request(url,settings,overrideToken){
      var params=settings||{},headers={};
      Object.keys(params.headers||{}).forEach(function(key){headers[key]=params.headers[key];});
      return Promise.resolve().then(function(){
        headers.Authorization='Bearer '+(overrideToken||validToken());
        return fetchFn(url,{method:params.method||'GET',headers:headers,body:params.body});
      }).then(function(response){
        if(!response||!response.ok){
          if(response&&response.status===401)forget();
          throw new Error('Google Drive request failed: '+(response?response.status:'network'));
        }
        return response;
      });
    }
    function json(url,settings,overrideToken){return request(url,settings,overrideToken).then(function(response){return response.json();});}
    function connect(){
      if(!options.clientId) return Promise.reject(new Error('Google OAuth client ID is not configured'));
      var requestGeneration=++generation;
      var grantRequest;
      try{grantRequest=options.requestAccessToken({clientId:options.clientId,scope:SCOPE});}
      catch(error){return Promise.reject(error);}
      return Promise.resolve(grantRequest).then(function(grant){
        if(requestGeneration!==generation)throw new Error('Google authorization was cancelled by disconnect');
        if(!grant||typeof grant.access_token!=='string'||!grant.access_token)throw new Error('Google authorization was cancelled');
        var newToken=grant.access_token;
        return json(BASE+'/about?fields='+encodeURIComponent('user(emailAddress,permissionId)'),null,newToken).then(function(about){
          if(requestGeneration!==generation)throw new Error('Google authorization was cancelled by disconnect');
          var user=about&&about.user;
          if(!user||!user.permissionId||!user.emailAddress)throw new Error('Google account identity is unavailable');
          if(currentAccount&&currentAccount.accountId!==user.permissionId){forget();throw new Error('Google account switched during this operation');}
          token=newToken;
          expiresAt=Date.now()+Math.max(1,Number(grant.expires_in)||3600)*1000-30000;
          currentAccount={accountId:String(user.permissionId),email:String(user.emailAddress)};
          return account();
        });
      }).catch(function(error){
        if(currentAccount&&/switch/i.test(String(error&&error.message)))forget();
        throw error;
      });
    }
    function account(){return currentAccount?{accountId:currentAccount.accountId,email:currentAccount.email}:null;}
    function list(properties){
      var query="trashed = false and "+propertyQuery(properties);
      var found=[];
      function page(pageToken){
        var url=BASE+'/files?q='+encodeURIComponent(query)+'&fields='+encodeURIComponent('nextPageToken,files(id,name,mimeType,createdTime,appProperties)')+'&pageSize=1000';
        if(pageToken)url+='&pageToken='+encodeURIComponent(pageToken);
        return json(url).then(function(result){
          if(!result||!Array.isArray(result.files))throw new Error('Google Drive list is incomplete');
          found=found.concat(result.files);
          return result.nextPageToken?page(result.nextPageToken):found;
        });
      }
      return page(null);
    }
    function ensureFolder(){
      if(folderId)return Promise.resolve(folderId);
      return list({trippilot_kind:'folder'}).then(function(found){
        if(found.length){folderId=found[0].id;return folderId;}
        return json(BASE+'/files?fields=id',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          name:'TripPilot',mimeType:'application/vnd.google-apps.folder',appProperties:{trippilot_kind:'folder'}
        })}).then(function(created){
          if(!created||!created.id)throw new Error('TripPilot folder creation was not confirmed');
          folderId=created.id;
          return folderId;
        });
      });
    }
    function uploadJson(existing,metadata,content){
      var url=UPLOAD+(existing?'/'+encodeURIComponent(existing.id):'')+'?uploadType=resumable&fields=id,appProperties';
      return request(url,{method:existing?'PATCH':'POST',headers:{'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':'application/json'},body:JSON.stringify(metadata)}).then(function(start){
        var location=start.headers&&start.headers.get('Location');
        if(!location)throw new Error('Google Drive upload session is missing');
        return json(location,{method:'PUT',headers:{'Content-Type':'application/json'},body:content});
      }).then(function(uploaded){
        if(!uploaded||!uploaded.id)throw new Error('Google Drive upload was not confirmed');
        return uploaded.id;
      });
    }
    function upsertPrepared(archiveId,content){
      if(typeof archiveId!=='string'||!archiveId||typeof content!=='string'||!content) return Promise.reject(new Error('Archive upload input is incomplete'));
      var parsed;try{parsed=JSON.parse(content);}catch(error){return Promise.reject(new Error('Archive upload JSON is invalid'));}
      if(parsed.archiveId!==archiveId||!parsed.sourceSheetId)return Promise.reject(new Error('Archive provenance is incomplete'));
      return list({trippilot_kind:'archive',trippilot_archive_id:archiveId}).then(function(found){
        var existing=found[0];
        if(existing&&existing.appProperties&&existing.appProperties.trippilot_status==='complete')return existing.id;
        return ensureFolder().then(function(parent){
          var metadata={name:'TripPilot-'+archiveId+'.json',mimeType:'application/json',
            appProperties:{trippilot_kind:'archive',trippilot_archive_id:archiveId,trippilot_source_sheet_id:String(parsed.sourceSheetId),trippilot_status:'prepared',trippilot_format:'1'}};
          if(!existing)metadata.parents=[parent];
          return uploadJson(existing,metadata,content);
        });
      });
    }
    function readArchive(fileId){
      if(!fileId)return Promise.reject(new Error('Archive file ID is required'));
      return request(BASE+'/files/'+encodeURIComponent(fileId)+'?alt=media').then(function(response){return response.text();});
    }
    function markComplete(fileId){
      if(!fileId)return Promise.reject(new Error('Archive file ID is required'));
      var url=BASE+'/files/'+encodeURIComponent(fileId);
      return json(url+'?fields=id,appProperties').then(function(file){
        var properties=file&&file.appProperties;
        if(!properties||properties.trippilot_kind!=='archive'||!properties.trippilot_archive_id)throw new Error('Archive metadata is incomplete');
        var next={};Object.keys(properties).forEach(function(key){next[key]=properties[key];});
        next.trippilot_status='complete';
        return json(url+'?fields=id,appProperties',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({appProperties:next})});
      }).then(function(updated){
        if(!updated||!updated.appProperties||updated.appProperties.trippilot_status!=='complete')throw new Error('Archive completion was not confirmed');
        return updated.id;
      });
    }
    function listComplete(){return list({trippilot_kind:'archive',trippilot_status:'complete'}).then(function(found){
      return found.filter(function(file){return file.appProperties&&file.appProperties.trippilot_status==='complete';});
    });}
    function appendNoteOnce(archiveId,note){
      if(!archiveId||!note||!note.id||typeof note.text!=='string'||!note.createdAt)return Promise.reject(new Error('Archive note is incomplete'));
      var properties={trippilot_kind:'note',trippilot_archive_id:String(archiveId),trippilot_note_id:String(note.id)};
      function verifyNote(id){return readArchive(id).then(function(content){
        var saved;try{saved=JSON.parse(content);}catch(error){throw new Error('Archive note readback is invalid');}
        if(String(saved.id)!==String(note.id)||saved.text!==note.text||String(saved.createdAt)!==String(note.createdAt))throw new Error('Archive note readback does not match');
        return id;
      });}
      return list(properties).then(function(found){
        var existing=found[0];
        if(existing&&existing.appProperties&&existing.appProperties.trippilot_status==='complete')return verifyNote(existing.id);
        return ensureFolder().then(function(parent){
          var metadata={name:'TripPilot-note-'+note.id+'.json',mimeType:'application/json',appProperties:{
            trippilot_kind:'note',trippilot_archive_id:String(archiveId),trippilot_note_id:String(note.id),trippilot_status:'prepared'
          }};
          if(!existing)metadata.parents=[parent];
          return uploadJson(existing,metadata,JSON.stringify({id:String(note.id),text:note.text,createdAt:String(note.createdAt)}));
        }).then(function(id){
          return json(BASE+'/files/'+encodeURIComponent(id)+'?fields=id,appProperties',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({
            appProperties:{trippilot_kind:'note',trippilot_archive_id:String(archiveId),trippilot_note_id:String(note.id),trippilot_status:'complete'}
          })}).then(function(updated){
            if(!updated||!updated.appProperties||updated.appProperties.trippilot_status!=='complete')throw new Error('Archive note was not confirmed');
            return verifyNote(id);
          });
        });
      });
    }
    function appendNote(archiveId,note){
      var key=String(archiveId)+'\u0000'+String(note&&note.id);
      if(noteFlights[key])return noteFlights[key];
      var pending=appendNoteOnce(archiveId,note);
      noteFlights[key]=pending;
      return pending.then(function(value){delete noteFlights[key];return value;},function(error){delete noteFlights[key];throw error;});
    }
    function listNotes(archiveId){
      if(!archiveId)return Promise.reject(new Error('Archive ID is required'));
      return list({trippilot_kind:'note',trippilot_archive_id:String(archiveId),trippilot_status:'complete'}).then(function(found){
        return Promise.all(found.map(function(file){
          return request(BASE+'/files/'+encodeURIComponent(file.id)+'?alt=media').then(function(response){return response.text();}).then(function(content){
            return {id:file.id,createdTime:file.createdTime,content:content};
          });
        }));
      });
    }
    function disconnect(){forget();}
    return {connect:connect,account:account,upsertPrepared:upsertPrepared,readArchive:readArchive,
      markComplete:markComplete,listComplete:listComplete,appendNote:appendNote,listNotes:listNotes,disconnect:disconnect};
  }
  return {createClient:createClient,SCOPE:SCOPE};
});
