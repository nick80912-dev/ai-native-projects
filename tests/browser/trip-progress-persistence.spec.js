const {test,expect}=require('./support/test');
const {installFixedDate,openApp,waitForSyncToSettle}=require('./support/qa-fixture');

async function setup(page){
  await installFixedDate(page,'2026-10-18T08:00:00+09:00');
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});
    window.fetch=()=>Promise.reject(new TypeError('QA_OFFLINE'));
    if(!sessionStorage.getItem('qa-progress-started')){
      localStorage.clear();localStorage.setItem('trip_member','Bar');sessionStorage.setItem('qa-progress-started','1');
    }
  });
  await openApp(page);await waitForSyncToSettle(page);
  await page.evaluate(()=>{
    DB.trip.days[0].items=[{id:'qa-a',time:'09:00',act:'早餐',place:'早餐'},
      {id:'qa-b',time:'11:00',act:'午餐',place:'午餐'},{id:'qa-c',time:'17:00',act:'晚餐',place:'晚餐'}];
    curDay=0;curView='today';renderAll();
    window.qaNativeSet=Storage.prototype.setItem;window.qaNativeGet=Storage.prototype.getItem;window.qaNativeRemove=Storage.prototype.removeItem;
  });
}
async function fault(page,mode){
  await page.evaluate(value=>{
    window.qaProgressWriteCount=0;
    Storage.prototype.setItem=function(key,text){
      if(key==='trip_checks'||key==='trip_next_stop_progress'){
        const n=++window.qaProgressWriteCount;
        if(value==='all'||(value==='first'&&key==='trip_next_stop_progress')||
          (value==='second'&&key==='trip_checks')||(value==='rollback'&&(n===2||n===3))){
          throw new DOMException('QA storage failure','QuotaExceededError');
        }
      }
      return window.qaNativeSet.call(this,key,text);
    };
    if(value==='rollback')Storage.prototype.removeItem=function(key){
      if(key==='trip_next_stop_progress')throw new DOMException('QA rollback failure','QuotaExceededError');
      return window.qaNativeRemove.call(this,key);
    };
  },mode);
}
const bytes=page=>page.evaluate(()=>{const get=window.qaNativeGet||Storage.prototype.getItem;return {checks:get.call(localStorage,'trip_checks'),progress:get.call(localStorage,'trip_next_stop_progress')};});
for(const mode of ['first','second'])test('failed '+mode+' key keeps actual progress and has no false success',async({page})=>{
  await setup(page);const before=await bytes(page);await fault(page,mode);
  await page.locator('.nx-decision-btn.done').click();
  await expect(page.locator('#toast')).toContainText('未能儲存');
  await expect(page.locator('.nx-decision-btn.done')).toBeVisible();
  expect(await bytes(page)).toEqual(before);
  expect(await page.evaluate(()=>lastNextStopAction)).toBeNull();
  await page.reload();await waitForSyncToSettle(page);
  expect(await bytes(page)).toEqual(before);
});
test('failed undo preserves the action and its retry restores persisted state',async({page})=>{
  await setup(page);await page.locator('.nx-decision-btn.done').click();
  await expect(page.locator('#toast')).toContainText('已完成');
  await fault(page,'all');await page.locator('#toast button').click();
  await expect(page.locator('#toast')).toContainText('未能儲存');
  await expect(page.locator('#toast button')).toHaveText('重試復原');
  expect(await page.evaluate(()=>lastNextStopAction.itemId)).toBe('qa-a');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('trip_checks'))['qa-a'])).toBe(true);
  await page.evaluate(()=>{Storage.prototype.setItem=qaNativeSet;});
  await page.locator('#toast button').click();await expect(page.locator('#toast')).toContainText('已復原');
  expect(await page.evaluate(()=>lastNextStopAction)).toBeNull();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('trip_checks'))['qa-a']||false)).toBe(false);
});
test('cancelling a completed past stop retains the established auto-skip state',async({page})=>{
  await setup(page);
  await page.evaluate(()=>{
    setItemCompletion(DB.trip.days[0],0,'qa-b','done');
    currentMinutes=()=>12*60;
    onCheck('qa-b',false);
  });
  await expect(page.locator('#toast')).toContainText('該行程時間已過');
  const state=await page.evaluate(()=>({checks:getChecks(),progress:getDayProgress(DB.trip.days[0],0)}));
  expect(state.checks['qa-b']).toBeUndefined();expect(state.progress.done['qa-b']).toBeUndefined();
  expect(state.progress.skip['qa-b']).toBe(true);expect(state.progress.autoSkip['qa-b']).toBe(true);
});
test('undo of the final completed cluster child reopens the controller immediately',async({page})=>{
  await setup(page);
  await page.evaluate(()=>{
    DB.trip.days[0].items[1].act='';
    setItemCompletion(DB.trip.days[0],0,'qa-a','done');renderToday();
  });
  await page.locator('.nx-decision-btn.done').click();
  expect(await page.evaluate(()=>getChecks()['qa-a__cluster'])).toBe(true);
  await page.locator('#toast button').click();
  await expect(page.locator('#toast')).toContainText('已復原完成');
  const state=await page.evaluate(()=>({checks:getChecks(),progress:getDayProgress(DB.trip.days[0],0)}));
  expect(state.checks['qa-b']).toBeUndefined();expect(state.checks['qa-a__cluster']).toBeUndefined();
  expect(state.progress.done['qa-b']).toBeUndefined();expect(state.progress.done['qa-a__cluster']).toBeUndefined();
  await expect(page.getByRole('button',{name:'完成：午餐',exact:true})).toBeVisible();
  await expect(page.locator('.nx-cluster-ticket .nx-ticket-line').first()).toContainText('這一站 11:00 午餐');
});
test('denied-read undo retains an accessible retry through repeated redraws',async({page})=>{
  await setup(page);await page.locator('.nx-decision-btn.done').click();
  const before=await bytes(page);
  await page.evaluate(()=>{
    Storage.prototype.getItem=function(key){
      if(key==='trip_checks')throw new DOMException('QA denied read','SecurityError');
      return qaNativeGet.call(this,key);
    };
  });
  await page.locator('#toast button').click();
  await expect(page.locator('#toast button')).toHaveText('重試復原');
  await page.evaluate(()=>renderToday());
  await expect(page.locator('#toast button')).toHaveText('重試復原');
  expect(await bytes(page)).toEqual(before);
  expect(await page.evaluate(()=>lastNextStopAction.itemId)).toBe('qa-a');
  await page.evaluate(()=>{Storage.prototype.getItem=qaNativeGet;});
  await page.locator('#toast button').click();
  await expect(page.locator('#toast')).toContainText('已復原完成');
  expect(await page.evaluate(()=>getChecks()['qa-a'])).toBeUndefined();
});
test('keyboard failed undo keeps focus on the retry action',async({page})=>{
  await setup(page);await page.locator('.nx-decision-btn.done').click();await fault(page,'all');
  await page.locator('#toast button').focus();await page.locator('#toast button').press('Enter');
  await expect(page.locator('#toast button')).toHaveText('重試復原');
  await expect(page.locator('#toast button')).toBeFocused();
  await page.evaluate(()=>{Storage.prototype.setItem=qaNativeSet;});
  await page.locator('#toast button').press('Enter');
  await expect(page.locator('#toast')).toContainText('已復原完成');
  expect(await page.evaluate(()=>getChecks()['qa-a'])).toBeUndefined();
});
test('unverified rollback explains the partial state rather than claiming success',async({page})=>{
  await setup(page);await fault(page,'rollback');await page.locator('.nx-decision-btn.done').click();
  await expect(page.locator('#toast')).toContainText('紀錄可能未完整儲存');
  await expect(page.locator('#tripProgressError')).toContainText('資料健康狀態');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('trip_next_stop_progress')).day_1_10_18.done['qa-a'])).toBe(true);
  expect(await page.evaluate(()=>localStorage.getItem('trip_checks'))).toBeNull();
  await page.evaluate(()=>openSettingsPage('health'));
  await expect(page.locator('.settings-health-summary-status')).toContainText('需注意');
  await expect(page.locator('.data-health-personal')).toContainText('紀錄可能未完整儲存');
});
test('keyboard check-in failure keeps focus, checked state and a readable error',async({page})=>{
  await setup(page);await page.evaluate(()=>switchView('trip'));await fault(page,'all');
  const check=page.locator('#it_qa-a .chk');await check.focus();await check.press('Space');
  await expect(check).toBeFocused();await expect(check).toHaveAttribute('aria-checked','false');
  await expect(page.locator('#toast')).toContainText('未能儲存');
});
test('failed automatic reconciliation does not repeat writes or success toasts on render',async({page})=>{
  await setup(page);await fault(page,'all');
  const result=await page.evaluate(()=>{
    const day=DB.trip.days[0],reference={day,dayIndex:0};
    const first=pickNextStop(day.items,{},{},12*60,reference),attempts=qaProgressWriteCount;
    const message=document.getElementById('toast').textContent;
    pickNextStop(day.items,{},{},12*60,reference);
    return {id:first.item.id,attempts,after:qaProgressWriteCount,message};
  });
  expect(result.id).toBe('qa-b');expect(result.after).toBe(result.attempts);
  expect(result.message).toContain('未能儲存');expect(result.message).not.toContain('已自動略過');
  expect((await bytes(page)).progress).toBeNull();
});
test('corrupt state remains untouched and does not produce a completed-day claim',async({page})=>{
  await setup(page);
  await page.evaluate(()=>{localStorage.setItem('trip_next_stop_progress','{broken');renderToday();});
  await expect(page.locator('#view-today')).not.toContainText('今日行程完成');
  await expect(page.locator('#tripProgressError')).toContainText('無法讀取');
  expect((await bytes(page)).progress).toBe('{broken');
});
test('inactive journey cannot be revived by old next-stop or undo handlers',async({page})=>{
  await setup(page);
  const result=await page.evaluate(()=>{
    localStorage.setItem('trip_lifecycle_state','{"mode":"complete"}');
    localStorage.removeItem('trip_checks');localStorage.removeItem('trip_next_stop_progress');
    onNextStopDone(0,'qa-a');onCheck('qa-a',false);
    return {checks:localStorage.getItem('trip_checks'),progress:localStorage.getItem('trip_next_stop_progress')};
  });
  expect(result).toEqual({checks:null,progress:null});
});
test('automatic cluster completion is not persisted or presented as successful after rejection',async({page})=>{
  await setup(page);
  await page.evaluate(()=>{
    DB.trip.days[0].items[1].act='';
    localStorage.setItem('trip_checks','{"qa-a":true,"qa-b":true}');
  });
  await fault(page,'all');await page.evaluate(()=>renderToday());
  await expect(page.locator('#toast')).toContainText('未能儲存');
  expect((await bytes(page)).progress).toBeNull();
  expect(await page.evaluate(()=>getChecks()['qa-a__cluster']||false)).toBe(false);
});
test('denied reads cannot clear the original bytes or claim successful completion',async({page})=>{
  await setup(page);const before=await bytes(page);
  await page.evaluate(()=>{
    Storage.prototype.getItem=function(key){
      if(key==='trip_checks'||key==='trip_next_stop_progress')throw new DOMException('QA denied read','SecurityError');
      return qaNativeGet.call(this,key);
    };
    onNextStopDone(0,'qa-a');
  });
  await expect(page.locator('#tripProgressError')).toContainText('無法讀取');
  await expect(page.locator('#view-today')).not.toContainText('今日行程完成');
  expect(await bytes(page)).toEqual(before);
});
