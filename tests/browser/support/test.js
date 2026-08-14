const base=require('@playwright/test');

function trackPageErrors(page){
  const errors=[];
  const collect=error=>errors.push(String(error&&error.stack||error&&error.message||error));
  page.on('pageerror',collect);
  return {
    errors,
    assert(){base.expect(errors,'unexpected pageerror(s)').toEqual([]);},
    dispose(){page.off('pageerror',collect);}
  };
}

const test=base.test.extend({
  page:async({page},use)=>{
    const tracker=trackPageErrors(page);
    await use(page);
    tracker.dispose();
    tracker.assert();
  }
});

module.exports=Object.assign({},base,{test,expect:base.expect,trackPageErrors});
