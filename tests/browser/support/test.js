const base=require('@playwright/test');

const test=base.test.extend({
  page:async({page},use)=>{
    const errors=[];
    const collect=error=>errors.push(String(error&&error.stack||error&&error.message||error));
    page.on('pageerror',collect);
    await use(page);
    page.off('pageerror',collect);
    base.expect(errors,'unexpected pageerror(s)').toEqual([]);
  }
});

module.exports=Object.assign({},base,{test,expect:base.expect});
