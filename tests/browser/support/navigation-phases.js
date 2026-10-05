// Start observing before activation, not after tap/assertions have consumed the highlight lifetime.
async function observeNavigationPhases(page,targetId,reducedMotion=false){
  await page.evaluate(({targetId,reducedMotion})=>{
    window.qaNavigationPhases=new Promise((resolve,reject)=>{
      let started=null,fadeAt=null;
      const observer=new MutationObserver(()=>{
        const element=document.getElementById(targetId);
        if(!element)return;
        const active=element.classList.contains('is-navigation-target');
        const fading=element.classList.contains('is-navigation-target-fading');
        if(active&&started===null)started=performance.now();
        if(fading&&fadeAt===null&&started!==null)fadeAt=performance.now()-started;
        if(started!==null&&!active&&!fading&&navigationIntentState.active===null){
          observer.disconnect();clearTimeout(timeoutId);
          resolve({fadeAt,clearAt:performance.now()-started,reducedMotion});
        }
      });
      observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
      const timeoutId=setTimeout(()=>{observer.disconnect();reject(new Error('navigation target phases did not complete'));},5000);
    });
    window.qaNavigationPhases.catch(()=>{});
  },{targetId,reducedMotion});
}
function navigationPhases(page){return page.evaluate(()=>window.qaNavigationPhases);}
module.exports={observeNavigationPhases,navigationPhases};
