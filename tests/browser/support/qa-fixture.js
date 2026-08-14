function collectPageErrors(page){
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error&&error.stack||error)));
  return errors;
}

async function installBaseLocalState(page){
  await page.addInitScript(()=>{
    localStorage.clear();
    localStorage.setItem('trip_member','Bar');
  });
}

async function installOfflineAppNetwork(page){
  await installBaseLocalState(page);
  await page.addInitScript(()=>{
    try{
      Object.defineProperty(window.navigator,'onLine',{configurable:true,get:()=>false});
    }catch(ignore){}
    window.fetch=()=>Promise.reject(new TypeError('QA_OFFLINE'));
  });
}

async function installOnlineSheetMock(page){
  await installBaseLocalState(page);
  await page.addInitScript(()=>{
    window.fetch=input=>{
      const url=new URL(String(input&&input.url||input),window.location.href);
      const gid=url.searchParams.get('gid');
      const sheet=window.SHEETS&&window.SHEETS.find(candidate=>String(candidate.gid)===String(gid));
      if(!sheet||!window.BUILTIN||typeof window.BUILTIN[sheet.key]!=='string'){
        return Promise.reject(new TypeError('QA_UNMOCKED_FETCH '+url.hostname+url.pathname));
      }
      return Promise.resolve(new Response(window.BUILTIN[sheet.key],{
        status:200,
        headers:{'Content-Type':'text/csv; charset=utf-8'}
      }));
    };
  });
}

async function installFixedDate(page,isoValue){
  await page.addInitScript(value=>{
    const NativeDate=window.Date;
    const fixedTime=new NativeDate(value).getTime();
    function FixedDate(){
      const args=Array.prototype.slice.call(arguments);
      if(!(this instanceof FixedDate))return new NativeDate(fixedTime).toString();
      if(args.length===0)return new NativeDate(fixedTime);
      return new (Function.prototype.bind.apply(NativeDate,[null].concat(args)))();
    }
    FixedDate.prototype=NativeDate.prototype;
    Object.setPrototypeOf(FixedDate,NativeDate);
    FixedDate.now=()=>fixedTime;
    window.Date=FixedDate;
  },isoValue);
}

async function openApp(page){
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1')return route.fallback();
    return route.abort('blockedbyclient');
  });
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof CURRENT_SNAPSHOT!=='undefined'&&typeof syncInFlight!=='undefined'&&(CURRENT_SNAPSHOT||document.getElementById('builtinRecovery')));
}

async function waitForSyncToSettle(page){
  await page.waitForFunction(()=>CURRENT_SNAPSHOT&&syncInFlight===null);
  await page.waitForTimeout(50);
}

module.exports={
  collectPageErrors,
  installFixedDate,
  installOfflineAppNetwork,
  installOnlineSheetMock,
  openApp,
  waitForSyncToSettle
};
