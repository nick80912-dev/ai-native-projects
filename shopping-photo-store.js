(function(root,factory){
  var api=factory(root||{});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.TripShoppingPhotos=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';

  var DB_NAME='trip-local-media';
  var DB_VERSION=1;
  var STORE_NAME='shopping-photos';
  var MAX_INPUT_BYTES=25*1024*1024;
  var DEFAULT_MAX_EDGE=1600;
  var DEFAULT_QUALITY=0.82;

  function fitImageSize(width,height,maxEdge){
    width=Number(width);height=Number(height);maxEdge=Number(maxEdge)||DEFAULT_MAX_EDGE;
    if(!isFinite(width)||!isFinite(height)||width<=0||height<=0)throw new Error('圖片尺寸無效');
    var scale=Math.min(1,maxEdge/Math.max(width,height));
    return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
  }

  function validateImageFile(file){
    if(!file||!/^image\//i.test(String(file.type||'')))throw new Error('請選擇圖片檔案');
    if(Number(file.size)>MAX_INPUT_BYTES)throw new Error('圖片不可超過 25 MiB');
    return file;
  }

  function requestResult(request){
    return new Promise(function(resolve,reject){
      request.onsuccess=function(){resolve(request.result===undefined?null:request.result);};
      request.onerror=function(){reject(request.error||new Error('照片資料庫操作失敗'));};
    });
  }

  function createIndexedDbDriver(indexedDB){
    indexedDB=indexedDB||(root&&root.indexedDB);
    var dbPromise=null;
    function open(){
      if(dbPromise)return dbPromise;
      dbPromise=new Promise(function(resolve,reject){
        if(!indexedDB||typeof indexedDB.open!=='function'){reject(new Error('此裝置無法保存照片附件'));return;}
        var request=indexedDB.open(DB_NAME,DB_VERSION);
        request.onupgradeneeded=function(){
          var db=request.result;
          if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME,{keyPath:'id'});
        };
        request.onsuccess=function(){resolve(request.result);};
        request.onerror=function(){dbPromise=null;reject(request.error||new Error('照片資料庫開啟失敗'));};
        request.onblocked=function(){dbPromise=null;reject(new Error('照片資料庫目前被其他頁面占用'));};
      });
      return dbPromise;
    }
    function transact(mode,operation){
      return open().then(function(db){
        return new Promise(function(resolve,reject){
          var tx;
          try{tx=db.transaction(STORE_NAME,mode);}catch(error){reject(error);return;}
          var settled=false,request;
          function fail(error){if(settled)return;settled=true;reject(error||new Error('照片資料庫操作失敗'));}
          tx.onabort=function(){fail(tx.error);};
          tx.onerror=function(){fail(tx.error);};
          try{request=operation(tx.objectStore(STORE_NAME));}catch(error){fail(error);return;}
          requestResult(request).then(function(value){
            tx.oncomplete=function(){if(settled)return;settled=true;resolve(value);};
          },fail);
        });
      });
    }
    return {
      put:function(record){return transact('readwrite',function(store){return store.put(record);}).then(function(){return record;});},
      get:function(id){return transact('readonly',function(store){return store.get(id);});},
      remove:function(id){return transact('readwrite',function(store){return store.delete(id);}).then(function(){return null;});}
    };
  }

  function createStore(options){
    options=options||{};
    var driver=options.driver||createIndexedDbDriver(options.indexedDB);
    var now=options.now||Date.now;
    var random=options.random||Math.random;
    function createId(){
      return 'shopping-photo-'+now()+'-'+Math.floor(random()*0x100000000).toString(36);
    }
    return {
      put:function(blob){
        if(!blob||typeof blob.size!=='number')return Promise.reject(new Error('照片內容無效'));
        var id=createId(),record={id:id,blob:blob,createdAt:new Date(now()).toISOString()};
        return Promise.resolve(driver.put(record)).then(function(){return id;});
      },
      get:function(id){
        id=String(id||'').trim();
        if(!id)return Promise.resolve(null);
        return Promise.resolve(driver.get(id)).then(function(record){return record&&record.blob||null;});
      },
      remove:function(id){
        id=String(id||'').trim();
        if(!id)return Promise.resolve();
        return Promise.resolve(driver.remove(id)).then(function(){return undefined;});
      }
    };
  }

  function imageFromBlob(file,environment){
    environment=environment||root;
    if(typeof environment.createImageBitmap==='function'){
      return environment.createImageBitmap(file).then(function(bitmap){
        return {source:bitmap,width:bitmap.width,height:bitmap.height,close:function(){if(bitmap.close)bitmap.close();}};
      });
    }
    return new Promise(function(resolve,reject){
      var ImageCtor=environment.Image,urlApi=environment.URL;
      if(!ImageCtor||!urlApi||typeof urlApi.createObjectURL!=='function'){reject(new Error('此瀏覽器無法解碼照片'));return;}
      var url=urlApi.createObjectURL(file),image=new ImageCtor();
      image.onload=function(){
        resolve({source:image,width:image.naturalWidth||image.width,height:image.naturalHeight||image.height,close:function(){urlApi.revokeObjectURL(url);}});
      };
      image.onerror=function(){urlApi.revokeObjectURL(url);reject(new Error('照片無法讀取'));};
      image.src=url;
    });
  }

  function canvasBlob(canvas,quality){
    return new Promise(function(resolve,reject){
      if(!canvas||typeof canvas.toBlob!=='function'){reject(new Error('此瀏覽器無法壓縮照片'));return;}
      canvas.toBlob(function(blob){
        if(blob)resolve(blob);else reject(new Error('照片壓縮失敗'));
      },'image/jpeg',quality);
    });
  }

  function compressImage(file,options){
    validateImageFile(file);
    options=options||{};
    var environment=options.environment||root,maxEdge=Number(options.maxEdge)||DEFAULT_MAX_EDGE;
    var quality=Number(options.quality);if(!(quality>0&&quality<=1))quality=DEFAULT_QUALITY;
    return imageFromBlob(file,environment).then(function(decoded){
      var size=fitImageSize(decoded.width,decoded.height,maxEdge),documentRef=environment.document;
      if(!documentRef||typeof documentRef.createElement!=='function'){decoded.close();throw new Error('此瀏覽器無法壓縮照片');}
      var canvas=documentRef.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
      var context=canvas.getContext&&canvas.getContext('2d');
      if(!context){decoded.close();throw new Error('此瀏覽器無法壓縮照片');}
      context.drawImage(decoded.source,0,0,size.width,size.height);decoded.close();
      return canvasBlob(canvas,quality);
    });
  }

  return {
    DB_NAME:DB_NAME,
    STORE_NAME:STORE_NAME,
    MAX_INPUT_BYTES:MAX_INPUT_BYTES,
    createIndexedDbDriver:createIndexedDbDriver,
    createStore:createStore,
    fitImageSize:fitImageSize,
    validateImageFile:validateImageFile,
    compressImage:compressImage
  };
});
