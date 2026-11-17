/* v195 繪本插圖跟著天氣換(Bar 2026-11-17)
   - 看當地現在的天氣:下雨 → 雨天城市,下雪 → 雪景,其他 → 晴天版(岡山行程用原本的桃子與大橋,其他旅程用通用版)。
   - 不從試算表選;沒有天氣(離線、還沒抓到)就用晴天版。
   - 設定「個人」的「繪本插圖」開關可以整個關掉,只在繪本主題出現。 */
const {test,expect}=require('./support/test');
const {installFixedDate,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');
test.use({timezoneId:'Asia/Tokyo'});

async function boot(page){
  await installOfflineAppNetwork(page);
  await page.addInitScript(()=>localStorage.setItem('trip_today_mode','"list"'));
  await installFixedDate(page,'2026-10-20T13:00:00+09:00');
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{closeMemberSelector();applyTheme('ehon',{persist:false});switchView('today');renderToday();});
}
const fakeWeather=(page,code)=>page.evaluate(c=>{
  homeWeatherFor=function(){return c===null?null:{status:'fresh',updatedAt:Date.now(),temp:10,rain:50,code:c,icon:'☁️',city:'測試'};};
  renderToday();
},code);
const scene=page=>page.locator('#view-today .today-hero-art .ehon-art').getAttribute('data-scene');

test('weather codes map to rain, snow or the sunny scene',async({page})=>{
  await boot(page);
  const result=await page.evaluate(()=>{
    const f=c=>ehonWeatherScene({status:'fresh',code:c});
    return {
      clear:[0,1,2,3,45].map(f),
      rain:[51,61,65,80,82,95,99].map(f),
      snow:[71,73,77,85,86].map(f),
      stale:ehonWeatherScene({status:'expired',code:61}),
      none:ehonWeatherScene(null)
    };
  });
  expect(result.clear.every(s=>s==='')).toBe(true);
  expect(result.rain.every(s=>s==='rain')).toBe(true);
  expect(result.snow.every(s=>s==='snow')).toBe(true);
  expect(result.stale).toBe('');
  expect(result.none).toBe('');
});

test('the today illustration follows the weather, and other trips get the richer general scene',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await boot(page);
  await fakeWeather(page,null);
  expect(await scene(page)).toBe('general');
  await fakeWeather(page,61);
  expect(await scene(page)).toBe('rain');
  expect(await page.locator('#view-today .ehon-art .ehon-rain').count()).toBe(2);
  await fakeWeather(page,73);
  expect(await scene(page)).toBe('snow');
  expect(await page.locator('#view-today .ehon-art .ehon-snow').count()).toBe(2);
  await fakeWeather(page,1);
  expect(await scene(page)).toBe('general');
  /* 岡山行程的晴天是桃子;其他旅程是通用版(燈塔、帆船) */
  const peach=await page.evaluate(()=>document.querySelector('#view-today .ehon-art').innerHTML.indexOf('M70 150c-14-2')>=0);
  expect(peach).toBe(true);
  await page.evaluate(()=>{tripName=function(){return '東京五天';};renderToday();});
  const general=await page.evaluate(()=>document.querySelector('#view-today .ehon-art').innerHTML);
  expect(general).not.toContain('M70 150c-14-2');
  expect(general).toContain('M326 120v-34h14v34');
  /* 動畫的 CSS transform 不能蓋掉位置:雲的位置放在內層 */
  await fakeWeather(page,61);
  const clouds=await page.evaluate(()=>[...document.querySelectorAll('#view-today .ehon-art g.ehon-cloud')].every(g=>!g.getAttribute('transform')&&g.firstElementChild.getAttribute('transform')));
  expect(clouds).toBe(true);
  expect(errors).toEqual([]);
});

test('settings switch hides the illustration and only shows in the 繪本 theme',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await boot(page);
  await page.evaluate(()=>openSettings());
  const sw=page.locator('#settingsEhonArt');
  await expect(sw).toBeChecked();
  await expect(page.locator('#settingsEhonArtSummary')).toHaveText('顯示');
  await sw.uncheck();
  await expect(page.locator('#settingsEhonArtSummary')).toHaveText('隱藏');
  expect(await page.evaluate(()=>localStorage.getItem('trip_ehon_art'))).toBe('false');
  await page.evaluate(()=>closeSettings());
  expect(await page.locator('#view-today .ehon-art').count()).toBe(0);
  expect(await page.locator('#view-today .today-hero-art').count()).toBe(0);
  await page.evaluate(()=>{openSettings();});
  await page.locator('#settingsEhonArt').check();
  await page.evaluate(()=>closeSettings());
  expect(await page.locator('#view-today .today-hero-art .ehon-art').count()).toBe(1);
  /* 其他主題沒有插圖,也不出現這個開關 */
  await page.evaluate(()=>{applyTheme('ocean',{persist:false});openSettings();});
  expect(await page.locator('#settingsEhonArt').count()).toBe(0);
  await expect(page.locator('#settingsTodayCardMode')).toHaveCount(1);
  expect(errors).toEqual([]);
});
