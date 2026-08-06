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

async function clearAndEnter(page,keys){
  await page.getByRole('button',{name:'清除算式'}).click();
  for(const key of keys){
    const name=key==='+'?'加':key==='-'?'減':key==='*'?'乘':key==='/'?'除':key;
    await page.getByRole('button',{name,exact:true}).click();
  }
}

test('單品金額計算器套用、取消與錯誤都保留 Ledger 草稿和操作脈絡',async({page})=>{
  const errors=collectPageErrors(page);
  await openEntry(page);
  await page.locator('#ledgerAmount').fill('1680');
  await page.locator('#ledgerDetail').fill('東京車站晚餐');
  const sheet=page.locator('#ledgerEntrySheet .ledger-sheet');
  const scrollBefore=await sheet.evaluate(node=>{node.scrollTop=Math.max(1,Math.floor((node.scrollHeight-node.clientHeight)/2));return node.scrollTop;});

  await page.getByRole('button',{name:'開啟金額計算機',exact:true}).click();
  await expect(page.locator('#ledgerCalculatorSheet')).toBeVisible();
  await expect(page.locator('#ledgerEntrySheet')).toHaveAttribute('inert','');
  await expect(page.locator('[data-calculator-key="7"]')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#ledgerCalculatorApply')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-calculator-key="7"]')).toBeFocused();
  await page.locator('#ledgerCalculatorSheet').click({position:{x:5,y:5}});
  await expect(page.locator('#ledgerCalculatorSheet')).toBeVisible();

  await clearAndEnter(page,['1','2','0','0','+','3','8','0','+','2','5','0']);
  await expect(page.locator('#ledgerCalculatorExpression')).toHaveText('1200+380+250');
  await expect(page.locator('#ledgerCalculatorResult')).toHaveText('1,830');
  await page.getByRole('button',{name:'套用 ¥1,830'}).click();

  await expect(page.locator('#ledgerCalculatorSheet')).toHaveCount(0);
  await expect(page.locator('#ledgerEntrySheet')).not.toHaveAttribute('inert','');
  await expect(page.locator('#ledgerAmount')).toHaveValue('1830');
  await expect(page.locator('#ledgerConvertedPreview')).not.toHaveText('—');
  await expect(page.locator('#ledgerDetail')).toHaveValue('東京車站晚餐');
  await expect(page.locator('#ledgerAmount')).toBeFocused();
  expect(await sheet.evaluate(node=>node.scrollTop)).toBe(scrollBefore);

  await page.locator('#ledgerAmount').fill('500');
  await page.getByRole('button',{name:'開啟金額計算機',exact:true}).click();
  await clearAndEnter(page,['9','9','9']);
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await expect(page.locator('#ledgerAmount')).toHaveValue('500');

  await page.getByRole('button',{name:'開啟金額計算機',exact:true}).click();
  await clearAndEnter(page,['7','/','2']);
  await page.getByRole('button',{name:'套用',exact:true}).click();
  await expect(page.locator('#ledgerCalculatorError')).toHaveText('記帳金額必須是大於 0 的整數');
  await expect(page.locator('#ledgerCalculatorSheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#ledgerCalculatorSheet')).toHaveCount(0);
  await expect(page.locator('#ledgerAmount')).toHaveValue('500');
  expect(errors).toEqual([]);
});

test('多品項與折扣共用同一計算器並在窄螢幕保持可操作',async({page})=>{
  const errors=collectPageErrors(page);
  await openEntry(page);
  await page.locator('#ledgerDetail').fill('第一項');
  await page.locator('#ledgerAmount').fill('100');
  await page.locator('#ledgerMulti').check();
  await expect(page.locator('[id^="ledgerItemAmount_"]')).toHaveCount(1);

  const itemCalculator=page.getByRole('button',{name:'開啟第 1 項金額計算機',exact:true});
  await itemCalculator.click();
  await clearAndEnter(page,['4','0','0','+','2','3','0']);
  await page.getByRole('button',{name:'套用 ¥630'}).click();
  await expect(page.locator('[id^="ledgerItemAmount_"]').first()).toHaveValue('630');
  await expect(page.locator('#ledgerBillPreview')).toContainText('¥630');

  await page.getByRole('button',{name:/稅與優惠券/}).click();
  await page.getByRole('button',{name:'開啟折扣金額計算機',exact:true}).click();
  await clearAndEnter(page,['0']);
  await page.getByRole('button',{name:'套用 ¥0'}).click();
  await expect(page.locator('#ledgerDiscount')).toHaveValue('0');

  for(const viewport of WIDTHS){
    await page.setViewportSize(viewport);
    await page.getByRole('button',{name:'開啟第 1 項金額計算機',exact:true}).click();
    const geometry=await page.evaluate(()=>{
      const overlay=document.getElementById('ledgerCalculatorSheet'),panel=overlay.querySelector('.ledger-calculator-sheet'),trigger=document.querySelector('.ledger-item-amount-field .ledger-calculator-trigger'),key=overlay.querySelector('.ledger-calculator-key');
      const tr=trigger.getBoundingClientRect(),kr=key.getBoundingClientRect(),pr=panel.getBoundingClientRect();
      return {
        documentOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
        entryOverflow:document.querySelector('#ledgerEntrySheet .ledger-sheet').scrollWidth>document.querySelector('#ledgerEntrySheet .ledger-sheet').clientWidth,
        calculatorOverflow:panel.scrollWidth>panel.clientWidth,
        panelInside:pr.left>=-.5&&pr.right<=innerWidth+.5,
        trigger:[Math.round(tr.width),Math.round(tr.height)],
        keyHeight:Math.round(kr.height)
      };
    });
    expect(geometry,`calculator @${viewport.width}`).toEqual({
      documentOverflow:false,entryOverflow:false,calculatorOverflow:false,panelInside:true,trigger:[44,44],keyHeight:48
    });
    await page.locator('#ledgerCalculatorSheet').getByRole('button',{name:'取消',exact:true}).click();
  }
  expect(errors).toEqual([]);
});
