# TripPilot v144 B 本機行程保存驗證

日期：2026-10-05。基準：765f710（origin/dev）；最終 runtime：900109c0948e007f70aa465c9538f953bea5ba91；隔離分支 codex/personal-trip-lifecycle。範圍由 Bar 四項確認核准，本機完成、未 push／merge／部署。現況權威為 tasks/current.md。

## 改動與限制

- Checked read／write 限定打卡與下一站兩鍵。無法讀取、壞 JSON、map 型別錯誤時不覆寫；先序列化所有值、保存原 raw bytes／不存在，再逐鍵寫入與讀回、整批讀回核對。
- 寫入失敗盡力恢复已嘗試的鍵，核對全部原值；只有核對原值一致才可回報已恢復。無法確認則顯示「紀錄可能未完整儲存」，重讀实际可讀資料，不宣稱回到原狀。
- 成功才更新 undo／成功提示。復原快照包含原 autoSkip；失敗保留快照與「重試復原」，自動重繪不覆蓋重試。復原子行程時，同批套用原群組完成規則維持 controller 一致，重繪不立刻再自動略過。過時打卡取消先於記憶體清除完成，再用原 selector 判定時間，僅保存最終狀態。
- 自動路徑失敗後本次 session 暫停自動寫入，手動成功才解除。失敗重繪只讀，讀取未知不顯示今日完成。鍵盤啟動復原前保留焦點資訊，失敗後接回重試按鈕；其他成功 toast 焦點行為不擴張改動。
- 沿用 toast live status、打卡鍵盤焦點、既有健康個人列；沒有新頁面、全域 popup、CSS／配色／字體變更。完整旅程仍可閱讀。
- localStorage 無交易或跨分頁鎖。本批不新增持久化 journal、不保證多分頁／程序被中止時的原子性；不改既有 progression 算法、時間門檻、群組阻擋、帳務、Schema、備份 v9／封存 v1、OAuth 或清除阻擋。
- v144 seed 僅採既有 v143 CSV，经 generator preview → write → readback → preview；八表內容與原 timestamp 一致，未 live fetch。v143、root v110、歷史 SW fixture 不修改。

## RED → GREEN 證據

- Task 1 RED：新 checked helper 不存在；GREEN：16 個 writer／reader 案例。
- Task 2 RED：舊完成／略過 caller 失敗仍替換 undo、browser 點擊失敗仍顯示「已完成這站」。GREEN：23 個 Node 行為案例。
- 健康頁 RED：rollback 未確認時仍顯示「資料狀態正常」；GREEN：同一故障顯示需注意與原錯誤，正常原四列保持不變。
- Fixture 修正不算產品 RED：讀回 mismatch 時點須在原值捕捉後；原鍵不存在時 rollback 用 removeItem；reload 後 native getter 需重取。
- Astra 整批審查的四項 Important 全部先以新增 Chromium 測試重現：過時取消沒有 autoSkip、復原最後子站卻保持群組完成、拒絕讀取復原沒有重試按鈕、鍵盤復原失敗焦點落到 BODY。單輪修正後，四項與原十項故障 browser 14/14 通過（36.2 秒）；Node 加入取消／群組一致性／群組回滾，26/26 通過。
- 群組 browser 綠測試首輪的附加顯示斷言誤看父群組標題；既有 UI 子站在「這一站」與完成按鈕標籤，改以其語意驗證，不改 UI、不算另一項產品缺陷。

## 已驗證／未驗證

| 項目 | 結果 |
| --- | --- |
| Node tests | 修正後 108 個檔案通過；persistence 26/26 故障／行為案例 |
| Browser 相關回歸 | 首輪相關 45/45；審查修正後故障專項 14/14 |
| Browser 全套 | 修正後 Chromium 257/257（10.7 分鐘、0 retry），退出碼 0；首輪 253/253（8.3 分鐘）僅作歷程，不代替最終結果 |
| 四項 repo gate／diff check | 通過 |
| 獨立整批審查 | Astra 新上下文審查 765f710..53a30f3；四項 Important 已逐項 RED→GREEN，再以修正後 108 Node 檔案／257 browser 全套驗證；無 Critical／Minor，沒有第二輪 reviewer |
| iOS／Android PWA／VoiceOver／TalkBack | 未驗；TP144-a～c 保持未勾 |
| Netlify／GitHub Pages 實際更新／headers | 未驗；未推送／部署 |

Browser 專項涵蓋第一／第二鍵拒絕、精確恢復與 reload、復原失敗／重試、rollback removeItem 失敗、鍵盤焦點、自动写入去重、壞 JSON、拒絕讀取、群組 controller 與 inactive 不復活。所有 Storage 注入、固定日期及行程 fixture 僅在隔離瀏覽器資料。

## 整批審查與裁定

唯一一輪獨立 Astra 審查回傳 request changes，四項 Important／P2；範圍內全部納入一輪修正，以故障 RED→GREEN 與修正後完整 QA 驗證，不再派第二輪 reviewer。

| 發現 | 根因／修正 | 驗證 |
| --- | --- | --- |
| 過時完成取消失去自動略過 | selector 看見尚未清除的 done；先在記憶體取消，原 selector／門檻不變，仍 checked 保存一次最終狀態 | Node 取消案例＋browser `cancelling a completed past stop…` RED→GREEN |
| 最後子站復原但群組仍完成 | 只讀 redraw 同時禁止 controller reconciliation；共用原 controller 決策，在復原兩鍵批次內更新受影響 controller，重繪保持只讀 | Node 原 autoSkip／兩鍵回滾＋browser `undo of the final completed cluster child…` RED→GREEN |
| 拒絕讀取時復原重試被移除 | auto-today-read toast 覆蓋 manual-undo；已有 session 錯誤時自動回饋保持安靜，不覆蓋重試 | browser `denied-read undo…` RED→GREEN，重繪後及恢復讀取重試皆驗證 |
| 鍵盤復原失敗失焦 | 舊 toast button 被移除才記焦點；消耗 action 前記住焦點，僅對保留的復原重試接回 | browser `keyboard failed undo…` RED→GREEN，Enter 重試可成功 |

裁定（含 reviewer declined-to-judge，皆記入執行 ledger）：

- 本次依 Bar 最新核准只交付本機；計畫的 push-dev 步驟保留待授權。代價：遠端 CI／測試站驗收需下一步。
- 多分頁競爭／程序中斷不擴張成交易保證；核准規格排除 journal／鎖。代價：此類中斷仍可能需健康頁調查。
- iOS／Android／閱讀器保留真機待驗；不以 Chromium 代替。代價：平台特有問題需後續補驗／修正。
- 一般成功 toast 焦點行為維持既有規則；本批僅修復失敗重試。代價：更廣的鍵盤可用性仍可能需改善。
- 不刪除 ignored QA workspace；repo 規則要求刪檔先確認，保留故障與審查證據。代價：佔用本機暫存空間。

Deferred minors：無。

本機證據：`node tests/trip-progress-persistence.test.js` → 26/26；全部 `tests/*.test.js` → 108 個檔案；`PORT=42817 npx playwright test` → 257/257。四項 `tools/check-{doc-titles,app-version,doc-generation,runtime-assets}.js` 與 `git diff --check` 皆退出碼 0。另外逐項比對既有 CSS／全域 lsGet／lsSet／getWants、純 module／Schema／歷代資產，並深度核對 seed CSV／時間戳。固定時間及網路 mock 不代表真實 Google 授權／部署 headers 已驗。

## 回復指引

保持已發布 generation 不變。如需回復，以最後驗證正常內容建立下一個未使用 generation，同步 SW／App version／BUILTIN marker／asset／inventory／cache header，經完整 QA 及核准發布。禁止覆寫 v143／v144 的已發布資產、刪除 sw.js 或清空使用者資料。本批不發布；B 驗收後才進 C。
