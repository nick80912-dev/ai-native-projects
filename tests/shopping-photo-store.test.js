const assert=require('assert');
const {
  createStore,
  fitImageSize,
  validateImageFile
}=require('../shopping-photo-store.js');

function memoryDriver(){
  const records=new Map();
  return {
    put(record){records.set(record.id,record);return Promise.resolve(record);},
    get(id){return Promise.resolve(records.get(id)||null);},
    remove(id){records.delete(id);return Promise.resolve();},
    ids(){return Array.from(records.keys());}
  };
}

(async function(){
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

  await store.remove(firstId);
  assert.strictEqual(await store.get(firstId),null,'removed photos read as null');
  assert.strictEqual(await store.get(secondId),secondBlob,'removing one photo does not affect another');
  assert.strictEqual(await store.get(''),null,'empty references degrade to no attachment');

  console.log('shopping photo store tests passed');
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
