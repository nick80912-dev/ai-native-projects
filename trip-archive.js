(function(root,factory){
  var api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TripArchive=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';

  var SHEETS=['itin','places','rest','shop','hotels','exp','cfg','ledger'];
  var PERSONAL_FIELDS=[
    'checks','nextStopProgress','wants','shoppingItems','personalLedger','proxyTargets',
    'ledgerCategories','ledgerPayMethods','shoppingUnits','travelNotes','member','themeId'
  ];
  var OMIT_FIELDS={photoId:true,ledgerQueue:true,access_token:true,diagnostics:true};

  function cloneSafe(value){
    if(Array.isArray(value))return value.map(cloneSafe);
    if(value&&typeof value==='object'){
      var copy={};
      Object.keys(value).forEach(function(key){
        if(!OMIT_FIELDS[key]&&value[key]!==undefined)copy[key]=cloneSafe(value[key]);
      });
      return copy;
    }
    return value;
  }
  function requiredText(value,label){
    if(typeof value!=='string'||!value.trim())throw new Error('Archive '+label+' is required');
    return value;
  }
  function project(input){
    if(!input||typeof input!=='object')throw new Error('Archive input is required');
    var trip=input.trip||{},sheets=input.sheets||{},personal=input.personal||{};
    var archive={
      format:'trippilot-archive',version:1,
      archiveId:requiredText(input.archiveId,'archiveId'),
      sourceSheetId:requiredText(input.sourceSheetId,'sourceSheetId'),
      trip:{name:requiredText(trip.name,'trip name'),startDate:requiredText(trip.startDate,'startDate'),endDate:requiredText(trip.endDate,'endDate')},
      archivedAt:requiredText(input.archivedAt,'archivedAt'),sheets:{},personal:{}
    };
    SHEETS.forEach(function(key){
      var sheet=sheets[key];
      if(!sheet||typeof sheet.csv!=='string'||!sheet.csv.trim()||typeof sheet.sourceTime!=='string'||!sheet.sourceTime.trim()){
        throw new Error('Archive sheet '+key+' is incomplete');
      }
      archive.sheets[key]={csv:sheet.csv,sourceTime:sheet.sourceTime};
    });
    PERSONAL_FIELDS.forEach(function(key){
      if(!Object.prototype.hasOwnProperty.call(personal,key)||personal[key]===null||personal[key]===undefined){
        throw new Error('Archive personal '+key+' is incomplete');
      }
      archive.personal[key]=cloneSafe(personal[key]);
    });
    return archive;
  }
  function browserSha256(text){
    if(!root.crypto||!root.crypto.subtle||!root.TextEncoder)return Promise.reject(new Error('SHA-256 is unavailable'));
    return root.crypto.subtle.digest('SHA-256',new root.TextEncoder().encode(text)).then(function(bytes){
      return Array.prototype.map.call(new Uint8Array(bytes),function(byte){return ('0'+byte.toString(16)).slice(-2);}).join('');
    });
  }
  function digest(text,sha256){return Promise.resolve((sha256||browserSha256)(text));}
  function serialize(input,sha256){
    return Promise.resolve().then(function(){
      var archive=project(input);
      return digest(JSON.stringify(archive),sha256).then(function(checksum){
        if(!/^[0-9a-f]{64}$/.test(checksum))throw new Error('Archive checksum is invalid');
        archive.checksum=checksum;
        return JSON.stringify(archive);
      });
    });
  }
  function parseVerified(text,sha256){
    var raw;
    try{raw=JSON.parse(text);}catch(error){return Promise.reject(new Error('Archive JSON is invalid'));}
    if(!raw||raw.format!=='trippilot-archive'||raw.version!==1)return Promise.reject(new Error('Archive format or version is unsupported'));
    var archive;
    try{archive=project(raw);}catch(error){return Promise.reject(error);}
    return digest(JSON.stringify(archive),sha256).then(function(checksum){
      if(checksum!==raw.checksum)throw new Error('Archive checksum integrity check failed');
      archive.checksum=checksum;
      return archive;
    });
  }

  return {serialize:serialize,parseVerified:parseVerified,SHEETS:SHEETS.slice()};
});
