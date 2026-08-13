const {test,expect}=require('@playwright/test');
const {
  collectPageErrors,
  installOfflineAppNetwork,
  openApp,
  waitForSyncToSettle
}=require('./support/qa-fixture');

for(const width of [320,375,390]){
  test(`hotel panels resolve a shared HID without horizontal overflow at ${width}px`,async({page})=>{
    const pageErrors=collectPageErrors(page);
    await page.setViewportSize({width:width,height:844});
    await installOfflineAppNetwork(page);
    await openApp(page);
    await waitForSyncToSettle(page);

    const result=await page.evaluate(function(){
      DB.hotels=[
        {hotelId:'H999',name:'每日停靠 A',checkin:'錯誤時間',addr:'錯誤地址'},
        {hotelId:'H001',name:'住宿主檔新名稱',checkin:'16:00後',addr:'共同地址'}
      ];
      var a={placeId:'P002',name:'每日停靠 A',type:'hotel',tnorm:'hotel',hotelId:'H001',travel:'開車30分鐘'};
      var b={placeId:'P013',name:'每日停靠 B',type:'hotel',tnorm:'hotel',hotelId:'H001',travel:'開車2小時'};
      DB.placeList=DB.placeList.map(function(place){
        if(place.placeId==='P002') return a;
        if(place.placeId==='P013') return b;
        return place;
      });
      DB.places.P002=a;
      DB.places.P013=b;
      var panelA=infoPanel({kind:'place',p:a});
      var panelB=infoPanel({kind:'place',p:b});
      switchView('trip');
      var host=document.createElement('section');
      host.id='hotelHidQa';
      host.className='item';
      host.innerHTML='<div class="panel open" data-place-id="P002">'+panelA+'</div>'+
        '<div class="panel open" data-place-id="P013">'+panelB+'</div>';
      document.getElementById('view-trip').replaceChildren(host);
      var hotelA=hotelOf(a);
      var hotelB=hotelOf(b);
      return {
        hotelA:hotelA&&hotelA.hotelId,
        hotelB:hotelB&&hotelB.hotelId,
        sameProfile:hotelA===hotelB,
        travelA:a.travel,
        travelB:b.travel,
        panelA:panelA,
        panelB:panelB,
        renderedPanels:host.querySelectorAll('.panel.open').length,
        renderedVisible:Array.from(host.querySelectorAll('.panel.open')).every(function(panel){
          return panel.getBoundingClientRect().width>0&&panel.getBoundingClientRect().height>0;
        }),
        renderedText:host.textContent,
        scrollWidth:document.documentElement.scrollWidth,
        clientWidth:document.documentElement.clientWidth
      };
    });

    expect(result.hotelA).toBe('H001');
    expect(result.hotelB).toBe('H001');
    expect(result.sameProfile).toBe(true);
    expect(result.travelA).not.toBe(result.travelB);
    expect(result.panelA).toContain('共同地址');
    expect(result.panelB).toContain('共同地址');
    expect(result.renderedPanels).toBe(2);
    expect(result.renderedVisible).toBe(true);
    expect(result.renderedText).toContain('共同地址');
    expect(result.scrollWidth,`document overflow @${width}px`).toBeLessThanOrEqual(result.clientWidth);
    expect(pageErrors).toEqual([]);
  });
}
