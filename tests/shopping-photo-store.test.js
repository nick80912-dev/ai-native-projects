const assert=require('assert');
const {
  createStore,
  fitImageSize,
  validateImageFile,
  auditAttachments,
  classifyCapacity,
  isQuotaExceededError
}=require('../shopping-photo-store.js');

function memoryDriver(){
  const records=new Map();
  return {
    put(record){records.set(record.id,record);return Promise.resolve(record);},
    get(id){return Promise.resolve(records.get(id)||null);},
    remove(id){records.delete(id);return Promise.resolve();},
    list(){return Promise.resolve(Array.from(records.values()));},
    ids(){return Array.from(records.keys());}
  };
}

(async function(){
  const audit=auditAttachments([
    {id:'valid-item',photoId:'valid-photo'},
    {id:'missing-item',photoId:'missing-photo'},
    {id:'legacy-item',photoId:''}
  ],[
    {id:'valid-photo',size:5,createdAt:'2026-07-31T00:00:00.000Z'},
    {id:'old-orphan',size:7,createdAt:'2026-07-30T00:00:00.000Z'},
    {id:'exact-orphan',size:11,createdAt:'2026-07-31T00:00:00.000Z'},
    {id:'young-orphan',size:13,createdAt:'2026-07-31T12:00:00.001Z'},
    {id:'unknown-orphan',size:17,createdAt:'not-a-date'}
  ],Date.parse('2026-08-01T00:00:00.000Z'));

  assert.deepStrictEqual(audit.validPhotoIds,['valid-photo']);
  assert.deepStrictEqual(audit.invalidReferences,[{itemId:'missing-item',photoId:'missing-photo'}]);
  assert.deepStrictEqual(audit.eligibleOrphanIds,['exact-orphan','old-orphan']);
  assert.strictEqual(audit.storedPhotoCount,5);
  assert.strictEqual(audit.storedBytes,53);
  assert.strictEqual(audit.orphanPhotos.find(value=>value.id==='young-orphan').eligibleForCleanup,false);
  assert.strictEqual(audit.orphanPhotos.find(value=>value.id==='unknown-orphan').eligibleForCleanup,false);
  assert.deepStrictEqual(
    auditAttachments([{id:'shared-a',photoId:'shared'},{id:'shared-b',photoId:'shared'}],[{id:'shared',size:4,createdAt:'2026-07-01T00:00:00.000Z'}],Date.now()).validPhotoIds,
    ['shared'],
    'a shared referenced blob is never orphaned'
  );

  const MIB=1024*1024;
  assert.deepStrictEqual(classifyCapacity(),{
    available:false,usageBytes:0,quotaBytes:0,remainingBytes:0,remainingRatio:0,low:false
  });
  assert.strictEqual(classifyCapacity({usage:100*MIB,quota:1000*MIB}).low,false);
  assert.strictEqual(classifyCapacity({usage:951*MIB,quota:1000*MIB}).low,true,'below 50 MiB is low');
  assert.strictEqual(classifyCapacity({usage:91*MIB,quota:100*MIB}).low,true,'below 10 percent is low');
  assert.strictEqual(classifyCapacity({usage:0,quota:0}).available,false,'zero quota is unavailable');
  assert.strictEqual(isQuotaExceededError({name:'QuotaExceededError'}),true);
  assert.strictEqual(isQuotaExceededError({code:22}),true);
  assert.strictEqual(isQuotaExceededError({name:'AbortError'}),false);
  assert.strictEqual(isQuotaExceededError(null),false);

  assert.deepStrictEqual(fitImageSize(4000,2000,1600),{width:1600,height:800},'landscape scales to the literal 1600px edge');
  assert.deepStrictEqual(fitImageSize(900,1200,1600),{width:900,height:1200},'small portrait is never enlarged');
  assert.deepStrictEqual(fitImageSize(1000,4000,1600),{width:400,height:1600},'portrait scaling preserves aspect ratio');
  assert.throws(()=>fitImageSize(0,1200,1600),/尺寸/,'zero-width images are rejected');

  assert.doesNotThrow(()=>validateImageFile({type:'image/png',size:1024}),'an ordinary image file is accepted');
  assert.throws(()=>validateImageFile({type:'text/plain',size:10}),/圖片/,'non-images are rejected');
  assert.throws(()=>validateImageFile({type:'image/jpeg',size:25*1024*1024+1}),/25 MiB/,'the input ceiling is enforced');

  const driver=memoryDriver();
  let sequence=0;
  const store=createStore({
    driver,
    now:()=>1722470400000,
    random:()=>++sequence/1000
  });
  const firstBlob=new Blob(['first'],{type:'image/jpeg'});
  const secondBlob=new Blob(['second'],{type:'image/jpeg'});
  const firstId=await store.put(firstBlob);
  const secondId=await store.put(secondBlob);

  assert.match(firstId,/^shopping-photo-1722470400000-/,'generated IDs remain local-media identifiers');
  assert.notStrictEqual(firstId,secondId,'separate puts never overwrite one another');
  assert.strictEqual(await store.get(firstId),firstBlob,'get returns the stored Blob, not the record wrapper');
  assert.deepStrictEqual(driver.ids(),[firstId,secondId],'both records remain present before explicit removal');
  assert.deepStrictEqual(await store.listMetadata(),[
    {id:firstId,size:firstBlob.size,createdAt:'2024-08-01T00:00:00.000Z'},
    {id:secondId,size:secondBlob.size,createdAt:'2024-08-01T00:00:00.000Z'}
  ]);

  await assert.rejects(
    createStore({driver:{put(){},get(){},remove(){},list(){return Promise.reject(new Error('LIST_FAILED'));}}}).listMetadata(),
    /LIST_FAILED/
  );

  await store.remove(firstId);
  assert.strictEqual(await store.get(firstId),null,'removed photos read as null');
  assert.strictEqual(await store.get(secondId),secondBlob,'removing one photo does not affect another');
  assert.strictEqual(await store.get(''),null,'empty references degrade to no attachment');

  console.log('shopping photo store tests passed');
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
