# TripPilot v144 B 本機行程保存驗證

日期：2026-10-05。基準：765f710（origin/dev）；隔離分支 codex/personal-trip-lifecycle。範圍由 Bar 四項確認核准，僅本機開發、未 push／merge／部署。現況權威為 tasks/current.md。

## 改動與限制

- Checked read／write 限定打卡與下一站兩鍵。無法讀取、壞 JSON、map 型別錯誤時不覆寫；先序列化所有值、保存原 raw bytes／不存在，再逐鍵寫入與讀回、整批讀回核對。
- 寫入失敗盡力恢复已嘗試的鍵，核對全部原值；只有核對原值一致才可回報已恢復。無法確認則顯示「紀錄可能未完整儲存」，重讀实际可讀資料，不宣稱回到原狀。
- 成功才更新 undo／成功提示。復原快照包含原 autoSkip；失敗保留快照與「重試復原」。自動略過一次保存最終狀態；自動路徑失敗後本次 session 暫停自動寫入，手動成功才解除。失敗重繪只讀，讀取未知不顯示今日完成。
- 沿用 toast live status、打卡鍵盤焦點、既有健康個人列；沒有新頁面、全域 popup、CSS／配色／字體變更。完整旅程仍可閱讀。
- localStorage 無交易或跨分頁鎖。本批不新增持久化 journal、不保證多分頁／程序被中止時的原子性；不改既有 progression 算法、時間門檻、群組阻擋、帳務、Schema、備份 v9／封存 v1、OAuth 或清除阻擋。
- v144 seed 僅採既有 v143 CSV，经 generator preview → write → readback → preview；八表內容與原 timestamp 一致，未 live fetch。v143、root v110、歷史 SW fixture 不修改。

## RED → GREEN 證據

- Task 1 RED：新 checked helper 不存在；GREEN：16 個 writer／reader 案例。
- Task 2 RED：舊完成／略過 caller 失敗仍替換 undo、browser 點擊失敗仍顯示「已完成這站」。GREEN：23 個 Node 行為案例。
- 健康頁 RED：rollback 未確認時仍顯示「資料狀態正常」；GREEN：同一故障顯示需注意與原錯誤，正常原四列保持不變。
- Fixture 修正不算產品 RED：讀回 mismatch 時點須在原值捕捉後；原鍵不存在時 rollback 用 removeItem；reload 後 native getter 需重取。

## 已驗證／未驗證

| 項目 | 結果 |
| --- | --- |
| Node tests | 108 個檔案通過（新增 23 故障／行為案例） |
| Browser 相關回歸 | today-live-info + trip-progress-persistence + trip-three-scenarios：45/45；最後故障專項 10/10 |
| Browser 全套 | 進行中，未宣稱通過 |
| 四項 repo gate／diff check | 通過 |
| 獨立整批審查 | 待完整 QA 後進行 |
| iOS／Android PWA／VoiceOver／TalkBack | 未驗；TP144-a～c 保持未勾 |
| Netlify／GitHub Pages 實際更新／headers | 未驗；未推送／部署 |

Browser 專項涵蓋第一／第二鍵拒絕、精確恢復與 reload、復原失敗／重試、rollback removeItem 失敗、鍵盤焦點、自动写入去重、壞 JSON、拒絕讀取、群組 controller 與 inactive 不復活。所有 Storage 注入、固定日期及行程 fixture 僅在隔離瀏覽器資料。

## 整批審查與裁定

待審查；不以自審代替獨立審查。

## 回復指引

保持已發布 generation 不變。如需回復，以最後驗證正常內容建立下一個未使用 generation，同步 SW／App version／BUILTIN marker／asset／inventory／cache header，經完整 QA 及核准發布。禁止覆寫 v143／v144 的已發布資產、刪除 sw.js 或清空使用者資料。本批不發布；B 驗收後才進 C。
