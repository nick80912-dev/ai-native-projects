const {test,expect}=require('@playwright/test');
const {
  collectPageErrors,
  installFixedDate,
  installOfflineAppNetwork,
  openApp,
  waitForSyncToSettle
}=require('./support/qa-fixture');

const NOW='2026-08-03T10:00:00+08:00';
const WIDTHS=[{width:320,height:700},{width:375,height:844},{width:390,height:844}];

async function openEntry(page){
  await installOfflineAppNetwork(page);
  await installFixedDate(page,NOW);
  await openApp(page);
  await waitForSyncToSettle(page);
  await page.evaluate(()=>{
    closeMemberSelector();
    memberRegistrationBridge.push({id:'qa-member',time:'2026-08-03T00:00:00.000Z',member:'Bar',recordType:'identity_registration'});
    switchView('split');openLedgerEntrySheet(false);
  });
  await expect(page.locator('#ledgerEntrySheet')).toBeVisible();
}

function keyName(key){
  return key==='AC'?'全部清除':key==='BACK'?'退格':key==='.'?'小數點':key==='00'?'雙零':key==='%'?'百分比':key==='='?'等於':key==='+'?'加':key==='-'?'減':key==='*'?'乘':key==='/'?'除':key;
}

async function clearAndEnter(page,keys){
  const calculator=page.locator('#ledgerCalculatorSheet');
  await calculator.getByRole('button',{name:'全部清除',exact:true}).click();
  for(const key of keys)await calculator.getByRole('button',{name:keyName(key),exact:true}).click();
}

test('單品計算器支援小數、購物百分比、等號與無條件捨去',async({page})=>{
  const errors=collectPageErrors(page);
  await openEntry(page);
  await page.locator('#ledgerAmount').fill('1680');
  await page.locator('#ledgerDetail').fill('東京車站晚餐');
  const sheet=page.locator('#ledgerEntrySheet .ledger-sheet');
  const scrollBefore=await sheet.evaluate(node=>{node.scrollTop=Math.max(1,Math.floor((node.scrollHeight-node.clientHeight)/2));return node.scrollTop;});

  await page.getByRole('button',{name:'開啟金額計算機',exact:true}).click();
  const calculator=page.locator('#ledgerCalculatorSheet');
  await expect(calculator).toBeVisible();
  await expect(page.locator('#ledgerEntrySheet')).toHaveAttribute('inert','');
  await expect(page.locator('[data-calculator-key="7"]')).toBeFocused();
  await calculator.getByRole('button',{name:'關閉金額計算機'}).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#ledgerCalculatorApply')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(calculator.getByRole('button',{name:'關閉金額計算機'})).toBeFocused();
  await calculator.click({position:{x:5,y:5}});
  await expect(calculator).toBeVisible();

  await clearAndEnter(page,['1','5','1','2','.','9','=']);
  await expect(page.locator('#ledgerCalculatorExpression')).toHaveText('1512.9');
  await expect(page.locator('#ledgerCalculatorResult')).toHaveText('1,512.9');
  await expect(page.locator('#ledgerCalculatorApplyHint')).toHaveText('將套用 ¥1,512');
  await expect(calculator).toBeVisible();
  await page.getByRole('button',{name:'套用金額 ¥1,512',exact:true}).click();

  await expect(calculator).toHaveCount(0);
  await expect(page.locator('#ledgerEntrySheet')).not.toHaveAttribute('inert','');
  await expect(page.locator('#ledgerAmount')).toHaveValue('1512');
  await expect(page.locator('#ledgerConvertedPreview')).not.toHaveText('—');
  await expect(page.locator('#ledgerDetail')).toHaveValue('東京車站晚餐');
  await expect(page.locator('#ledgerAmount')).toBeFocused();
  expect(await sheet.evaluate(node=>node.scrollTop)).toBe(scrollBefore);

  await page.getByRole('button',{name:'開啟金額計算機',exact:true}).click();
  await clearAndEnter(page,['1','0','0','0','-','1','0','%','=']);
  await expect(page.locator('#ledgerCalculatorExpression')).toHaveText('1000−10%');
  await expect(page.locator('#ledgerCalculatorResult')).toHaveText('900');
  await calculator.getByRole('button',{name:'2',exact:true}).click();
  await expect(page.locator('#ledgerCalculatorExpression')).toHaveText('2');
  await calculator.getByRole('button',{name:'等於',exact:true}).click();
  await calculator.getByRole('button',{name:'加',exact:true}).click();
  await expect(page.locator('#ledgerCalculatorExpression')).toHaveText('2＋');

  await clearAndEnter(page,['0','.','9']);
  await calculator.getByRole('button',{name:'套用金額',exact:true}).click();
  await expect(page.locator('#ledgerCalculatorError')).toHaveText('捨去後金額必須大於 0');
  await expect(calculator).toBeVisible();
  await calculator.getByRole('button',{name:'全部清除',exact:true}).click();
  await page.keyboard.type('1000-10%');
  await page.keyboard.press('Enter');
  await expect(page.locator('#ledgerCalculatorResult')).toHaveText('900');

  await clearAndEnter(page,['1','0','0','0','=']);
  await calculator.getByRole('button',{name:'百分比',exact:true}).click();
  await expect(page.locator('#ledgerCalculatorExpression')).toHaveText('1000%');
  await expect(page.locator('#ledgerCalculatorResult')).toHaveText('10');

  await calculator.getByRole('button',{name:'關閉金額計算機'}).click();
  await expect(page.locator('#ledgerAmount')).toHaveValue('1512');
  expect(errors).toEqual([]);
});

test('多品項與折扣共用計算器並在窄螢幕保持可操作',async({page})=>{
  const errors=collectPageErrors(page);
  await openEntry(page);
  await page.locator('#ledgerDetail').fill('第一項');
  await page.locator('#ledgerAmount').fill('100');
  await page.locator('#ledgerMulti').check();
  await expect(page.locator('[id^="ledgerItemAmount_"]')).toHaveCount(1);

  const itemCalculator=page.getByRole('button',{name:'開啟第 1 項金額計算機',exact:true});
  await itemCalculator.click();
  await clearAndEnter(page,['4','0','0','+','2','3','0']);
  await page.getByRole('button',{name:'套用金額 ¥630',exact:true}).click();
  await expect(page.locator('[id^="ledgerItemAmount_"]').first()).toHaveValue('630');
  await expect(page.locator('#ledgerBillPreview')).toContainText('¥630');

  await page.getByRole('button',{name:/稅與優惠券/}).click();
  await page.getByRole('button',{name:'開啟折扣金額計算機',exact:true}).click();
  await clearAndEnter(page,['0','.','9']);
  await expect(page.locator('#ledgerCalculatorApplyHint')).toHaveText('將套用 ¥0');
  await page.getByRole('button',{name:'套用金額 ¥0',exact:true}).click();
  await expect(page.locator('#ledgerDiscount')).toHaveValue('0');

  for(const viewport of WIDTHS){
    await page.setViewportSize(viewport);
    await page.getByRole('button',{name:'開啟第 1 項金額計算機',exact:true}).click();
    const geometry=await page.evaluate(()=>{
      const overlay=document.getElementById('ledgerCalculatorSheet'),panel=overlay.querySelector('.ledger-calculator-sheet'),trigger=document.querySelector('.ledger-item-amount-field .ledger-calculator-trigger'),keys=Array.from(overlay.querySelectorAll('.ledger-calculator-key')),close=overlay.querySelector('.ledger-calculator-close'),actions=overlay.querySelector('.ledger-calculator-actions');
      const tr=trigger.getBoundingClientRect(),cr=close.getBoundingClientRect(),pr=panel.getBoundingClientRect(),style=getComputedStyle(overlay.querySelector('.ledger-calculator-keys'));
      return {
        documentOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
        entryOverflow:document.querySelector('#ledgerEntrySheet .ledger-sheet').scrollWidth>document.querySelector('#ledgerEntrySheet .ledger-sheet').clientWidth,
        calculatorOverflow:panel.scrollWidth>panel.clientWidth,
        panelInside:pr.left>=-.5&&pr.right<=innerWidth+.5,
        columns:style.gridTemplateColumns.split(' ').length,
        minKeyWidthAtLeast44:Math.min(...keys.map(node=>node.getBoundingClientRect().width))>=44,
        minKeyHeightAtLeast48:Math.min(...keys.map(node=>node.getBoundingClientRect().height))>=48,
        trigger:[Math.round(tr.width),Math.round(tr.height)],
        closeTarget:[Math.round(cr.width),Math.round(cr.height)],
        actionsPresent:!!actions
      };
    });
    expect(geometry,`calculator @${viewport.width}`).toEqual({
      documentOverflow:false,entryOverflow:false,calculatorOverflow:false,panelInside:true,columns:4,minKeyWidthAtLeast44:true,minKeyHeightAtLeast48:true,trigger:[44,44],closeTarget:[44,44],actionsPresent:true
    });
    await page.locator('#ledgerCalculatorSheet .ledger-calculator-actions').scrollIntoViewIfNeeded();
    await expect(page.locator('#ledgerCalculatorApply')).toBeVisible();
    await page.locator('#ledgerCalculatorSheet').getByRole('button',{name:'取消',exact:true}).click();
  }
  expect(errors).toEqual([]);
});
