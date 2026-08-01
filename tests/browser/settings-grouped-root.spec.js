/* tests/browser/settings-grouped-root.spec.js — v74 設定根頁群組列表 Browser QA
   ============================================================
   對應設計規格 §6.2 必須重新驗證的項目。Node 契約測試證明「渲染字串長什麼樣」,
   這裡證明的是真實 layout 與跨頁狀態:三個寬度下的水平溢位、六主題可讀性、
   測試模式關→開→關的完整循環與根頁警告列同步、legacy deep link 真的抵達可關閉的頁面。
   ============================================================ */
const {test,expect}=require('@playwright/test');
const {collectPageErrors,installOfflineAppNetwork,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

test.describe.configure({mode:'serial'});

const WIDTHS=[{w:320,h:700},{w:375,h:812},{w:390,h:844}];

async function openSettingsRoot(page){
  await page.evaluate(()=>{ if(document.getElementById('settingsOverlay'))closeSettings(); openSettings('root'); });
  await page.waitForSelector('#settingsOverlay .settings-panel');
}

async function setTestMode(page,on){
  await page.evaluate(value=>{
    openSettings('test-mode');
    const box=document.querySelector('#settingsOverlay #ledgerTestModeSection input[type=checkbox]');
    box.checked=value;
    setLedgerTestMode(box);
  },on);
}

test('三群組根頁在 320／375／390px 下沒有水平溢位,列高與觸控面積達標',async({page})=>{
  const pageErrors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);

  for(const size of WIDTHS){
    await page.setViewportSize({width:size.w,height:size.h});
    await openSettingsRoot(page);
    const state=await page.evaluate(()=>{
      const panel=document.querySelector('#settingsOverlay .settings-panel');
      const rows=Array.from(panel.querySelectorAll('.settings-row'));
      return {
        groups:Array.from(panel.querySelectorAll('.settings-group-title'),el=>el.textContent),
        docOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
        panelOverflow:panel.scrollWidth>panel.clientWidth,
        rowOverflow:rows.filter(row=>row.scrollWidth>row.clientWidth).length,
        minRowHeight:Math.min(...rows.map(row=>Math.round(row.getBoundingClientRect().height))),
        minActionHeight:Math.min(...Array.from(panel.querySelectorAll('.settings-identity-actions .btn'),
          btn=>Math.round(btn.getBoundingClientRect().height))),
        identityRowLines:Math.round(panel.querySelector('.settings-identity-current').getBoundingClientRect().height)
      };
    });
    expect(state.groups,`群組順序 @${size.w}px`).toEqual(['個人','記帳','資料']);
    expect(state.docOverflow,`document 水平溢位 @${size.w}px`).toBe(false);
    expect(state.panelOverflow,`panel 水平溢位 @${size.w}px`).toBe(false);
    expect(state.rowOverflow,`列水平溢位 @${size.w}px`).toBe(0);
    expect(state.minRowHeight,`最小列高 @${size.w}px`).toBeGreaterThanOrEqual(52);
    expect(state.minActionHeight,`身分按鈕觸控高度 @${size.w}px`).toBeGreaterThanOrEqual(38);
  }
  expect(pageErrors).toEqual([]);
});

test('測試模式關→開→關的完整循環,根頁警告列即時同步且回到正式帳本',async({page})=>{
  const pageErrors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);

  /* 關閉時:根頁完全不渲染測試模式,不留隱藏節點 */
  await openSettingsRoot(page);
  const off=await page.evaluate(()=>{
    const panel=document.querySelector('#settingsOverlay .settings-panel');
    return {
      warningRow:!!panel.querySelector('.settings-testmode-row'),
      mentionsTestMode:panel.innerHTML.includes('測試模式'),
      anyToggle:!!panel.querySelector('input[onchange*="setLedgerTestMode"]')
    };
  });
  expect(off.warningRow).toBe(false);
  expect(off.mentionsTestMode).toBe(false);
  expect(off.anyToggle).toBe(false);

  /* 診斷面板是關閉狀態下唯一的啟用入口 */
  const diag=await page.evaluate(()=>{
    openDiagnostics();
    const hasEntry=!!document.querySelector('#diagnosticOverlay button[onclick="openTestModeSettings()"]');
    openTestModeSettings();
    return {
      hasEntry,
      diagnosticsClosed:!document.getElementById('diagnosticOverlay'),
      page:settingsUiState.page,
      hasCheckbox:!!document.querySelector('#settingsOverlay #ledgerTestModeSection input[type=checkbox]')
    };
  });
  expect(diag.hasEntry).toBe(true);
  expect(diag.diagnosticsClosed).toBe(true);
  expect(diag.page).toBe('test-mode');
  expect(diag.hasCheckbox).toBe(true);

  /* 開啟後:根頁底部出現條件式警告列,且仍然沒有可直接切換的控制項 */
  await setTestMode(page,true);
  await openSettingsRoot(page);
  const on=await page.evaluate(()=>{
    const panel=document.querySelector('#settingsOverlay .settings-panel');
    const row=panel.querySelector('.settings-testmode-row');
    const groups=Array.from(panel.querySelectorAll('.settings-group'));
    return {
      present:!!row,
      text:row&&row.textContent,
      height:row&&Math.round(row.getBoundingClientRect().height),
      normalHeight:Math.round(panel.querySelector('.settings-row').getBoundingClientRect().height),
      insideLedgerGroup:!!(row&&groups[1].contains(row)),
      isLastInGroup:!!(row&&groups[1].querySelector('.settings-group-card').lastElementChild===row),
      anyToggle:!!panel.querySelector('input[onchange*="setLedgerTestMode"]')
    };
  });
  expect(on.present).toBe(true);
  expect(on.text).toContain('團體帳測試模式已開啟');
  expect(on.insideLedgerGroup).toBe(true);
  expect(on.isLastInGroup).toBe(true);
  expect(on.anyToggle).toBe(false);
  expect(on.height).toBeLessThanOrEqual(on.normalHeight);

  /* legacy deep link:分帳頁 TEST banner 用的正是這個 target,必須抵達可關閉的頁面 */
  const deepLink=await page.evaluate(()=>{
    closeSettings();
    openSettings('ledgerTestModeSection');
    const box=document.querySelector('#settingsOverlay #ledgerTestModeSection input[type=checkbox]');
    return {page:settingsUiState.page,reachedToggle:!!box,checked:!!(box&&box.checked)};
  });
  expect(deepLink.page).toBe('test-mode');
  expect(deepLink.reachedToggle).toBe(true);
  expect(deepLink.checked).toBe(true);

  /* 關閉後:警告列立即消失,分帳回到正式帳本 */
  await setTestMode(page,false);
  await openSettingsRoot(page);
  const after=await page.evaluate(()=>{
    const panel=document.querySelector('#settingsOverlay .settings-panel');
    return {
      warningRow:!!panel.querySelector('.settings-testmode-row'),
      mentionsTestMode:panel.innerHTML.includes('測試模式'),
      universe:String(ledgerUniverseMode())
    };
  });
  expect(after.warningRow).toBe(false);
  expect(after.mentionsTestMode).toBe(false);
  expect(after.universe).toBe('formal');
  expect(pageErrors).toEqual([]);
});

test('六個主題下群組卡片、分隔線與文字都保持可讀',async({page})=>{
  const pageErrors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);
  await openSettingsRoot(page);

  const readings=await page.evaluate(()=>{
    function luminance(color){
      const parts=color.match(/[\d.]+/g).slice(0,3).map(Number).map(value=>{
        const channel=value/255;
        return channel<=0.03928?channel/12.92:Math.pow((channel+0.055)/1.055,2.4);
      });
      return 0.2126*parts[0]+0.7152*parts[1]+0.0722*parts[2];
    }
    function contrast(a,b){
      const first=luminance(a),second=luminance(b);
      return (Math.max(first,second)+0.05)/(Math.min(first,second)+0.05);
    }
    const result={};
    THEME_IDS.forEach(id=>{
      applyTheme(id,{persist:false});
      closeSettings();
      openSettings('root');
      const panel=document.querySelector('#settingsOverlay .settings-panel');
      const card=panel.querySelector('.settings-group-card');
      const cardBg=getComputedStyle(card).backgroundColor;
      const paper=getComputedStyle(document.body).backgroundColor;
      const second=panel.querySelectorAll('.settings-group-card>*')[1];
      result[id]={
        dividerWidth:parseFloat(getComputedStyle(second).borderTopWidth),
        groupTitle:contrast(getComputedStyle(panel.querySelector('.settings-group-title')).color,paper),
        rowTitle:contrast(getComputedStyle(panel.querySelector('.settings-row-main b')).color,cardBg),
        summary:contrast(getComputedStyle(panel.querySelector('.settings-row-summary')).color,cardBg),
        icon:contrast(getComputedStyle(panel.querySelector('.settings-row-icon')).color,cardBg)
      };
    });
    applyTheme('ocean',{persist:false});
    return result;
  });

  for(const [id,reading] of Object.entries(readings)){
    /* 分隔線必須真的畫出來 —— .settings-row 的 border:0 曾經把它整個蓋掉 */
    expect(reading.dividerWidth,`${id} 群組分隔線`).toBeGreaterThan(0);
    expect(reading.groupTitle,`${id} 群組標題對比`).toBeGreaterThanOrEqual(4.5);
    expect(reading.rowTitle,`${id} 列標題對比`).toBeGreaterThanOrEqual(4.5);
    expect(reading.summary,`${id} 摘要對比`).toBeGreaterThanOrEqual(4.5);
    expect(reading.icon,`${id} 圖示對比`).toBeGreaterThanOrEqual(3);
  }
  expect(pageErrors).toEqual([]);
});

test('根頁與各子頁(含 test-mode)各自保存捲動位置',async({page})=>{
  const pageErrors=collectPageErrors(page);
  await installOfflineAppNetwork(page);
  await openApp(page);
  await waitForSyncToSettle(page);

  /* 刻意用最窄視窗讓面板一定可捲動,否則 scrollTop 永遠是 0,這條就驗不到東西 */
  await page.setViewportSize({width:320,height:420});
  await openSettingsRoot(page);

  const state=await page.evaluate(()=>{
    const panel=()=>document.querySelector('#settingsOverlay .settings-panel');
    const scrollable=panel().scrollHeight>panel().clientHeight;
    panel().scrollTop=30;
    const rootScroll=Math.round(panel().scrollTop);
    openSettingsPage('data');
    const dataStart=Math.round(panel().scrollTop);
    panel().scrollTop=45;
    const dataScroll=Math.round(panel().scrollTop);
    backToSettingsRoot();
    const rootRestored=Math.round(panel().scrollTop);
    openSettingsPage('data');
    const dataRestored=Math.round(panel().scrollTop);
    backToSettingsRoot();
    openSettingsPage('test-mode');
    /* captureSettingsScroll() 是在「離開某頁」時才寫入該頁的 slot,
       所以 test-mode 的 slot 要等返回根頁之後才存在 —— 這裡刻意在離開後才讀。 */
    backToSettingsRoot();
    const slots=Object.keys(settingsUiState.scrollTopByPage);
    return {scrollable,rootScroll,dataStart,dataScroll,rootRestored,dataRestored,slots};
  });

  expect(state.scrollable,'面板在此視窗下必須可捲動,否則本測試無效').toBe(true);
  expect(state.dataStart,'進入子頁時從自己的位置開始').toBe(0);
  expect(state.rootRestored,'返回根頁恢復根頁捲動位置').toBe(state.rootScroll);
  expect(state.dataRestored,'重新進入子頁恢復子頁捲動位置').toBe(state.dataScroll);
  expect(state.slots).toContain('test-mode');
  expect(pageErrors).toEqual([]);
});
