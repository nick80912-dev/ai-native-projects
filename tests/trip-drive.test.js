const assert=require('assert');
const TripDrive=require('../trip-drive.js');

function response(status,body,headers){
  const values=headers||{};
  return {ok:status>=200&&status<300,status:status,
    headers:{get:function(name){return values[name]||values[name.toLowerCase()]||null;}},
    json:function(){return Promise.resolve(body);},
    text:function(){return Promise.resolve(typeof body==='string'?body:JSON.stringify(body));}};
}
function fakeServer(){
  const files=[],sessions={};let next=1,unauthorized=false;
  function file(id){return files.filter(function(item){return item.id===id;})[0];}
  function matching(query,item){
    const properties=item.appProperties||{};
    const tests=[...query.matchAll(/appProperties has \{ key='([^']+)' and value='([^']+)' \}/g)];
    return tests.every(function(match){return properties[match[1]]===match[2];});
  }
  function fetch(url,options){
    const request=options||{},method=request.method||'GET',uri=new URL(url);
    const bearer=String((request.headers||{}).Authorization||'');
    if(unauthorized)return Promise.resolve(response(401,{error:'expired'}));
    if(!bearer.startsWith('Bearer token-'))throw new Error('Drive request lacked bearer token');
    if(uri.pathname==='/drive/v3/about'){
      const who=bearer==='Bearer token-two'?{permissionId:'user-two',emailAddress:'two@example.com'}:{permissionId:'user-one',emailAddress:'one@example.com'};
      return Promise.resolve(response(200,{user:who}));
    }
    if(uri.pathname==='/drive/v3/files'&&method==='GET'){
      const query=uri.searchParams.get('q')||'';
      return Promise.resolve(response(200,{files:files.filter(function(item){return matching(query,item)&&!item.trashed;}).map(function(item){return {id:item.id,name:item.name,appProperties:item.appProperties,createdTime:item.createdTime,mimeType:item.mimeType};})}));
    }
    if(uri.pathname==='/drive/v3/files'&&method==='POST'){
      const item=Object.assign({id:'file-'+next++,createdTime:'2026-10-24T01:00:00Z'},JSON.parse(request.body));
      files.push(item);
      return Promise.resolve(response(200,item));
    }
    const upload=uri.pathname.match(/^\/upload\/drive\/v3\/files(?:\/([^/]+))?$/);
    if(upload&&(method==='POST'||method==='PATCH')){
      const id=upload[1]||'file-'+next++;
      sessions[id]={id:id,metadata:JSON.parse(request.body),existing:!!upload[1]};
      return Promise.resolve(response(200,'',{Location:'https://upload.example/session/'+id}));
    }
    const session=uri.pathname.match(/^\/session\/(file-\d+)$/);
    if(uri.hostname==='upload.example'&&session&&method==='PUT'){
      const pending=sessions[session[1]],existing=file(pending.id);
      const item=Object.assign(existing||{id:pending.id,createdTime:'2026-10-24T01:00:00Z'},pending.metadata,{content:request.body});
      if(!existing)files.push(item);
      return Promise.resolve(response(200,{id:item.id,appProperties:item.appProperties}));
    }
    const target=uri.pathname.match(/^\/drive\/v3\/files\/(file-\d+)$/);
    if(target){
      const item=file(target[1]);
      if(!item)return Promise.resolve(response(404,{error:'not found'}));
      if(method==='GET'&&uri.searchParams.get('alt')==='media')return Promise.resolve(response(200,item.content));
      if(method==='GET')return Promise.resolve(response(200,item));
      if(method==='PATCH'){
        Object.assign(item,JSON.parse(request.body));
        return Promise.resolve(response(200,item));
      }
    }
    throw new Error('Unexpected fake Drive request: '+method+' '+url);
  }
  return {fetch:fetch,files:files,setUnauthorized:function(value){unauthorized=value;}};
}

(async function(){
  const server=fakeServer(),scopes=[];
  let gestureStarted=false;
  const gestureClient=TripDrive.createClient({fetch:server.fetch,clientId:'test-client-id',requestAccessToken:function(){
    gestureStarted=true;
    return Promise.resolve({access_token:'token-one',expires_in:3600});
  }});
  const gestureConnection=gestureClient.connect();
  assert.strictEqual(gestureStarted,true,'OAuth popup request starts in the user click task, before the first await');
  await gestureConnection;

  const client=TripDrive.createClient({fetch:server.fetch,clientId:'test-client-id',requestAccessToken:function(options){
    scopes.push(options.scope);
    return Promise.resolve({access_token:'token-one',expires_in:3600});
  }});
  assert.deepStrictEqual(await client.connect(),{accountId:'user-one',email:'one@example.com'});
  assert.deepStrictEqual(client.account(),{accountId:'user-one',email:'one@example.com'});
  assert.deepStrictEqual(scopes,['https://www.googleapis.com/auth/drive.file']);

  const archiveText='{"archiveId":"archive-1"}';
  const first=await client.upsertPrepared('archive-1',archiveText);
  const retry=await client.upsertPrepared('archive-1',archiveText);
  assert.strictEqual(first,retry,'same archive ID reuses the prepared file');
  assert.strictEqual(server.files.filter(function(item){return item.appProperties&&item.appProperties.trippilot_kind==='archive';}).length,1);
  assert.deepStrictEqual(await client.listComplete(),[],'prepared upload is not a past trip');
  assert.strictEqual(await client.readArchive(first),archiveText);
  await client.markComplete(first);
  const past=await client.listComplete();
  assert.strictEqual(past.length,1);
  assert.strictEqual(past[0].id,first);
  assert.strictEqual(past[0].appProperties.trippilot_status,'complete');

  const note={id:'note-1',text:'旅程很棒',createdAt:'2026-10-24T02:00:00Z'};
  const noteId=await client.appendNote('archive-1',note);
  assert.strictEqual(await client.appendNote('archive-1',note),noteId,'same note ID does not duplicate a note');
  const notes=await client.listNotes('archive-1');
  assert.strictEqual(notes.length,1);
  assert.deepStrictEqual(JSON.parse(notes[0].content),note);
  assert.strictEqual(server.files.filter(function(item){return item.appProperties&&item.appProperties.trippilot_kind==='note';}).length,1);

  server.setUnauthorized(true);
  await assert.rejects(client.listComplete(),/401|auth|token/i);
  assert.strictEqual(client.account(),null,'401 invalidates in-memory account and token');
  server.setUnauthorized(false);

  const cancelled=TripDrive.createClient({fetch:server.fetch,clientId:'test-client-id',requestAccessToken:function(){return Promise.reject(new Error('cancelled'));}});
  await assert.rejects(cancelled.connect(),/cancelled/);
  assert.strictEqual(cancelled.account(),null);

  let selected='token-one';
  const switched=TripDrive.createClient({fetch:server.fetch,clientId:'test-client-id',requestAccessToken:function(){return Promise.resolve({access_token:selected,expires_in:3600});}});
  await switched.connect();
  selected='token-two';
  await assert.rejects(switched.connect(),/account|switch/i);
  assert.strictEqual(switched.account(),null,'account change must not leave old data context active');

  const expired=TripDrive.createClient({fetch:server.fetch,clientId:'test-client-id',requestAccessToken:function(){
    return Promise.resolve({access_token:'token-one',expires_in:1});
  }});
  await expired.connect();
  await assert.rejects(expired.listComplete(),/expired|authorization/i,'expired token must reject through the Promise interface');
  assert.strictEqual(expired.account(),null);

  console.log('trip Drive repository tests passed');
})().catch(function(error){console.error(error);process.exitCode=1;});
