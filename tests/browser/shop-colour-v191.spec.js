/* v191 購物頁色彩(Bar 2026-11-15「購物分頁有點蒼白」,看過截圖後回 Great)
   - 繪本:商場名稱整條上色(依商場順序五色輪流)、樓層編號山吹黃膠囊、「想逛店家：0 家」奶油底。
   - 所有主題:展開的樓層和店家清單接成一塊有底色的面板。
   - 其他主題的商場名稱與樓層編號不變。 */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');
test.use({timezoneId:'Asia/Tokyo'});
async function shop(page,theme){
  await page.evaluate(theme=>{applyTheme(theme,{persist:false});switchView('shop');},theme);
  return page.evaluate(()=>{
    const malls=[...document.querySelectorAll('#view-shop .shop-mall')];
    const head=document.querySelector('#view-shop .floor-head');
    const empty=document.querySelector('#view-shop .want-box-empty');
    const before={head:getComputedStyle(head).borderBottomLeftRadius};
    head.click();
    const body=document.querySelector('#view-shop .floor-body.open');
    const css=e=>getComputedStyle(e);
    const r={
      tones:malls.map(m=>(m.className.match(/sm-tone-(\d)/)||[])[1]),
      names:malls.map(m=>css(m.querySelector('.sm-name')).backgroundColor),
      pill:css(head.querySelector('.fl-f')).backgroundColor,
      empty:empty&&css(empty).backgroundColor,
      closedRadius:before.head,
      openHeadRadius:css(head).borderBottomLeftRadius,
      body:{bg:css(body).backgroundColor,top:css(body).borderTopWidth,bottomRadius:css(body).borderBottomLeftRadius},
      paper:css(document.body).backgroundColor,
      overflow:document.documentElement.scrollWidth>window.innerWidth
    };
    head.click();
    return r;
  });
}
test('the 繪本 shopping page is tinted and every theme shows an open floor as one panel',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await installOfflineAppNetwork(page);
  await installFixedDate(page,'2026-10-20T12:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{closeMemberSelector();localStorage.setItem('trip_member','Bar');});
  const ehon=await shop(page,'ehon');
  expect(ehon.tones.slice(0,5)).toEqual(['0','1','2','3','4']);
  expect(ehon.names.slice(0,5)).toEqual(['rgb(242, 164, 151)','rgb(168, 211, 230)','rgb(185, 218, 165)','rgb(201, 184, 227)','rgb(246, 210, 122)']);
  expect(ehon.pill).toBe('rgb(246, 210, 122)');
  /* v199(Bar 2026-11-18):沒有想逛時不再每個商場一列「0 家」,改成頁首提示一次 */
  expect(ehon.empty).toBeNull();
  await expect(page.locator('#view-shop .shop-wants-hint')).toHaveCount(1);
  expect(ehon.body).toEqual({bg:'rgb(255, 247, 223)',top:'0px',bottomRadius:'14px'});
  expect(ehon.closedRadius).toBe('14px');
  expect(ehon.openHeadRadius).toBe('0px');
  expect(ehon.overflow).toBe(false);
  for(const theme of ['ocean','ivory','wisteria','cedar','mist','tea']){
    const r=await shop(page,theme);
    expect(r.names.every(c=>c==='rgba(0, 0, 0, 0)'),theme+' mall names stay plain').toBe(true);
    expect(r.pill,theme+' floor label stays plain').toBe('rgba(0, 0, 0, 0)');
    expect(r.body,theme+' open floor panel').toEqual({bg:r.paper,top:'0px',bottomRadius:'14px'});
    expect(r.openHeadRadius,theme+' open floor head joins the panel').toBe('0px');
    expect(r.overflow,theme+' overflow').toBe(false);
  }
  expect(errors).toEqual([]);
});
