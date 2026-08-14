const { test, expect } = require('./support/test');
const {
  installFixedDate,
  installOfflineAppNetwork,
  openApp,
  waitForSyncToSettle,
} = require('./support/qa-fixture');

test.beforeEach(async ({ page }) => {
  await installFixedDate(page, '2026-10-18T09:30:00+09:00');
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
});

test('Today hides the trip day picker and header actions fit without absolute positioning', async ({ page }) => {
  await expect(page.locator('#daybar')).toBeHidden();
  const header = await page.evaluate(() => ({
    titleFlex: getComputedStyle(document.querySelector('.brand .t')).flexGrow,
    actionsPosition: getComputedStyle(document.querySelector('.brand-actions')).position,
    syncHeight: document.getElementById('syncBtn').getBoundingClientRect().height,
    settingsHeight: document.querySelector('.settings-btn').getBoundingClientRect().height,
  }));
  expect(Number(header.titleFlex)).toBeGreaterThan(0);
  expect(header.actionsPosition).toBe('static');
  expect(header.syncHeight).toBeGreaterThanOrEqual(44);
  expect(header.settingsHeight).toBeGreaterThanOrEqual(44);
});

test('settings button renders a compact currentColor sliders icon', async ({ page }) => {
  const button=page.getByRole('button',{name:'設定'});
  const icon=button.locator('.settings-sliders');
  await expect(icon).toBeVisible();
  await expect(icon.locator('.settings-slider-rail')).toHaveCount(3);
  await expect(icon.locator('.settings-slider-knob')).toHaveCount(3);
  const sliders=await icon.evaluate(svg=>({
    size:[svg.getBoundingClientRect().width,svg.getBoundingClientRect().height],
    strokeWidth:getComputedStyle(svg).strokeWidth,
    viewBox:svg.getAttribute('viewBox'),
    rails:Array.from(svg.querySelectorAll('.settings-slider-rail'),path=>path.getAttribute('d')),
    knobs:Array.from(svg.querySelectorAll('.settings-slider-knob'),circle=>[circle.getAttribute('cx'),circle.getAttribute('cy'),circle.getAttribute('r')]),
    button:[svg.closest('button').getBoundingClientRect().width,svg.closest('button').getBoundingClientRect().height],
    buttonRadius:getComputedStyle(svg.closest('button')).borderRadius,
    stroke:getComputedStyle(svg).stroke,
    color:getComputedStyle(svg.closest('button')).color,
    caps:Array.from(svg.querySelectorAll('.settings-slider-rail'),path=>getComputedStyle(path).strokeLinecap),
  }));
  expect(sliders.size).toEqual([22,22]);
  expect(parseFloat(sliders.strokeWidth)).toBe(1.75);
  expect(sliders.button).toEqual([44,44]);
  expect(sliders.buttonRadius).toBe('50%');
  expect(sliders.viewBox).toBe('0 0 24 24');
  expect(sliders.rails).toEqual(['M3 6h3 M10 6h11','M3 12h11 M18 12h3','M3 18h7 M14 18h7']);
  expect(sliders.knobs).toEqual([['8','6','2'],['16','12','2'],['12','18','2']]);
  expect(sliders.stroke).toBe(sliders.color);
  expect(sliders.caps.every(cap=>cap==='round')).toBe(true);
});

test('settings and sync keep compact chrome inside 44px targets at phone widths',async({page})=>{
  for(const width of [320,375,390]){
    await page.setViewportSize({width,height:844});
    const layout=await page.evaluate(()=>{
      function metrics(button,content){
        const rect=button.getBoundingClientRect(),style=getComputedStyle(button),chrome=getComputedStyle(button,'::before'),contentRect=content.getBoundingClientRect();
        const top=parseFloat(chrome.top),bottom=parseFloat(chrome.bottom);
        return {
          width:rect.width,
          height:rect.height,
          visualHeight:rect.height-top-bottom,
          chromeTop:top,
          chromeBottom:bottom,
          chromeBackground:chrome.backgroundColor,
          chromePointerEvents:chrome.pointerEvents,
          chromeZIndex:chrome.zIndex,
          buttonBackground:style.backgroundColor,
          contentZIndex:getComputedStyle(content).zIndex,
          centerOffset:Math.abs((contentRect.top+contentRect.height/2)-(rect.top+rect.height/2)),
          left:rect.left,
          right:rect.right,
        };
      }
      const settings=document.querySelector('.settings-btn'),sync=document.getElementById('syncBtn');
      return {
        documentOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
        settings:metrics(settings,settings.querySelector('svg')),
        sync:metrics(sync,document.getElementById('syncTxt')),
      };
    });
    expect(layout.documentOverflow,`document overflow @${width}`).toBe(false);
    expect(layout.sync.right,`sync stays left of settings @${width}`).toBeLessThanOrEqual(layout.settings.left);
    for(const [name,control] of Object.entries({settings:layout.settings,sync:layout.sync})){
      expect(control.height,`${name} target height @${width}`).toBeGreaterThanOrEqual(44);
      expect(control.chromeTop,`${name} chrome top @${width}`).toBe(4);
      expect(control.chromeBottom,`${name} chrome bottom @${width}`).toBe(4);
      expect(control.visualHeight,`${name} visual height @${width}`).toBe(36);
      expect(control.chromeBackground,`${name} chrome background @${width}`).not.toBe('rgba(0, 0, 0, 0)');
      expect(control.chromePointerEvents,`${name} chrome pointer behavior @${width}`).toBe('none');
      expect(control.chromeZIndex,`${name} chrome layer @${width}`).toBe('0');
      expect(control.buttonBackground,`${name} button background @${width}`).toBe('rgba(0, 0, 0, 0)');
      expect(control.contentZIndex,`${name} content layer @${width}`).toBe('1');
      expect(control.centerOffset,`${name} vertical center @${width}`).toBeLessThanOrEqual(.5);
    }
  }
});

test('all six themes preserve sliders currentColor and compact header chrome',async({page})=>{
  const themes=await page.evaluate(()=>THEME_IDS.map(id=>{
    document.documentElement.dataset.theme=id;
    const settings=document.querySelector('.settings-btn'),sync=document.getElementById('syncBtn'),icon=settings.querySelector('.settings-sliders');
    return {
      id,
      action:getComputedStyle(document.documentElement).getPropertyValue('--t-action').trim(),
      iconStroke:icon&&getComputedStyle(icon).stroke,
      buttonColor:getComputedStyle(settings).color,
      settingsChrome:getComputedStyle(settings,'::before').backgroundColor,
      syncChrome:getComputedStyle(sync,'::before').backgroundColor,
    };
  }));
  for(const theme of themes){
    expect(theme.iconStroke,theme.id+' sliders currentColor').toBe(theme.buttonColor);
    expect(theme.settingsChrome,theme.id+' settings chrome').not.toBe('rgba(0, 0, 0, 0)');
    expect(theme.syncChrome,theme.id+' sync chrome').not.toBe('rgba(0, 0, 0, 0)');
  }
  expect(themes.find(theme=>theme.id==='cedar').action).toBe('#2f6b4f');
  expect(themes.find(theme=>theme.id==='tea').action).toBe('#896748');
});

test('presentation tokens preserve touched component geometry across all six themes',async({page})=>{
  const themes=await page.evaluate(()=>THEME_IDS.map(id=>{
    document.documentElement.dataset.theme=id;
    const fixture=document.createElement('div');
    fixture.innerHTML='<div class="navigation-target-status navigation-target-status-visible">找不到對應地點</div>'+
      '<div class="diag-log-entry diag-impact-degraded"><b>診斷</b><span>目前仍可使用</span></div>'+
      '<button class="btn">主要操作</button><button class="ledger-sheet-back">安靜操作</button>';
    document.body.appendChild(fixture);
    const root=getComputedStyle(document.documentElement),hero=document.querySelector('.today-hero'),heroDate=hero.querySelector('.date');
    const navigation=fixture.querySelector('.navigation-target-status-visible'),diagnostic=fixture.querySelector('.diag-log-entry');
    const primary=fixture.querySelector('.btn'),quiet=fixture.querySelector('.ledger-sheet-back');
    const read=element=>{
      const style=getComputedStyle(element);
      return {background:style.backgroundColor,color:style.color,fontSize:style.fontSize,radius:style.borderRadius,minHeight:style.minHeight};
    };
    const result={
      id,
      tokens:['--font-caption','--font-meta','--font-body','--font-title','--font-display','--space-1','--space-2','--space-3','--space-4','--space-5','--radius-sm','--radius-control','--radius-card','--radius-pill']
        .map(name=>root.getPropertyValue(name).trim()),
      roles:{sea:root.getPropertyValue('--sea').trim(),lineSoft:root.getPropertyValue('--line-soft').trim(),seaDeep:root.getPropertyValue('--sea-deep').trim()},
      hero:read(hero),heroDate:read(heroDate),navigation:read(navigation),diagnostic:read(diagnostic),
      diagnosticTitle:read(diagnostic.querySelector('b')),primary:read(primary),quiet:read(quiet),
      overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth
    };
    fixture.remove();
    return result;
  }));
  const expectedTokens=['11px','12px','14px','20px','24px','4px','8px','12px','16px','24px','6px','10px','14px','999px'];
  for(const theme of themes){
    expect(theme.tokens,theme.id+' token scale').toEqual(expectedTokens);
    expect(theme.hero.radius,theme.id+' Today Hero radius').toBe('16px');
    expect(theme.heroDate.fontSize,theme.id+' Today display size').toBe('24px');
    expect(theme.navigation.fontSize,theme.id+' navigation meta size').toBe('12px');
    expect(theme.navigation.radius,theme.id+' navigation status radius').toBe('8px');
    expect(theme.diagnostic.radius,theme.id+' diagnostic radius').toBe('7px');
    expect(theme.diagnosticTitle.fontSize,theme.id+' diagnostic title size').toBe('12px');
    expect(theme.primary.fontSize,theme.id+' primary action size').toBe('13.5px');
    expect(theme.primary.radius,theme.id+' primary action radius').toBe('9px');
    expect(theme.quiet.fontSize,theme.id+' quiet action size').toBe('14px');
    expect(theme.quiet.radius,theme.id+' quiet action radius').toBe('999px');
    expect(parseFloat(theme.quiet.minHeight),theme.id+' quiet target size').toBeGreaterThanOrEqual(44);
    expect(theme.overflow,theme.id+' overflow').toBe(false);
  }
});

test('trip and shopping controls keep car-friendly targets and decision text', async ({ page }) => {
  await page.evaluate(() => switchView('trip'));
  await expect(page.locator('#daybar')).toBeVisible();
  expect(await page.locator('.day-chip').first().evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);

  await page.evaluate(() => switchView('today'));
  const decision = page.locator('.nx-decision-btn').first();
  await expect(decision).toBeVisible();
  expect(await decision.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);

  await page.evaluate(() => switchView('shop'));
  const filter = page.locator('.shop-filter-btn').first();
  await expect(filter).toBeVisible();
  expect(await filter.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
});

/* v80:同區串點的下方決策列會把地點名稱塞進兩顆按鈕(「完成：永旺夢樂城…」)。
   .nx-ticket-low 的第二軌是 auto,跳過鈕的 max-content 會吃掉整列寬度,
   讓 minmax(0,1fr) 的完成鈕被壓到接近 0,標籤於是一個字一行直排。
   量的是真實 view 寬度下的實際 markup。 */
test('a long place name cannot starve the done button', async ({ page }) => {
  const metrics = await page.evaluate(() => {
    const name = '永旺夢樂城岡山購物中心四樓無印良品櫃位';
    const ticket = document.createElement('div');
    ticket.className = 'nx-ticket nx-cluster-ticket';
    ticket.innerHTML =
      '<div class="nx-ticket-low">' +
      '<button class="nx-decision-btn done">完成：' + name + '</button>' +
      '<button class="nx-decision-btn skip">跳過：' + name + '</button>' +
      '</div>';
    document.querySelector('.view.active').appendChild(ticket);
    const doneEl = ticket.querySelector('.done');
    const skipEl = ticket.querySelector('.skip');
    const done = doneEl.getBoundingClientRect();
    const skip = skipEl.getBoundingClientRect();
    const result = {
      doneWidth: done.width,
      doneHeight: done.height,
      skipWidth: skip.width,
      skipHeight: skip.height,
      doneWhiteSpace: getComputedStyle(doneEl).whiteSpace,
      skipWhiteSpace: getComputedStyle(skipEl).whiteSpace,
      doneOverflows: doneEl.scrollWidth > doneEl.clientWidth,
      skipOverflows: skipEl.scrollWidth > skipEl.clientWidth,
    };
    ticket.remove();
    return result;
  });
  expect(metrics.doneWidth).toBeGreaterThan(metrics.skipWidth);
  /* 兩顆都必須是「一行 + 省略號」,而不是換行長高:
     min-height 是 46px,所以單行就等於 46px。 */
  expect(metrics.doneWhiteSpace).toBe('nowrap');
  expect(metrics.skipWhiteSpace).toBe('nowrap');
  expect(metrics.doneHeight).toBe(46);
  expect(metrics.skipHeight).toBe(46);
  expect(metrics.doneOverflows).toBe(true);
  expect(metrics.skipOverflows).toBe(true);
});

function relativeLuminance(rgb) {
  const channels = rgb.match(/[\d.]+/g).slice(0, 3).map(value => {
    const channel = Number(value) / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function readThemePalettes(page) {
  return page.evaluate(() => ['ocean','ivory','wisteria','cedar','mist','tea'].map(id => {
    document.documentElement.dataset.theme = id;
    const card = document.createElement('div');
    card.className = 'card';
    document.body.appendChild(card);
    const result = {
      id,
      paper: getComputedStyle(document.body).backgroundColor,
      card: getComputedStyle(card).backgroundColor,
      ink: getComputedStyle(document.body).color,
    };
    card.remove();
    return result;
  }));
}

/* v80:同一個主題在 iPhone 淺色／深色外觀下必須長得一模一樣。
   量兩次(light / dark)再比對,比單獨斷言「是淺色」更能擋住日後又被加回來的自動深色。 */
test('all six themes stay light under system dark appearance', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  const light = await readThemePalettes(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  const dark = await readThemePalettes(page);

  expect(dark).toEqual(light);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light');
  for (const palette of dark) {
    expect(relativeLuminance(palette.paper), palette.id + ' paper').toBeGreaterThan(0.7);
    expect(relativeLuminance(palette.card), palette.id + ' card').toBeGreaterThan(0.7);
    expect(contrastRatio(palette.ink, palette.paper), palette.id + ' ink').toBeGreaterThanOrEqual(4.5);
  }
});

test('reduced-motion preference disables smooth scrolling and view animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const motion = await page.evaluate(() => ({
    scroll: getComputedStyle(document.documentElement).scrollBehavior,
    animation: getComputedStyle(document.querySelector('.view.active')).animationDuration,
  }));
  expect(motion.scroll).toBe('auto');
  expect(parseFloat(motion.animation)).toBeLessThanOrEqual(0.001);
});
