# TripPilot v145 C 驗證記錄

日期：2026-10-05。Current status authority：`tasks/current.md`。本文件是本批證據與限制，不是發布核准。

## 核准與範圍

Bar 確認 C 四點：保留 B 五筆本機提交、沿用隔離 worktree；v144 → 未使用 v145；原八表 CSV／timestamp；原來源／6500ms timeout／城市 resolver／3h TTL。僅本機實作與提交，未 push、merge 或部署。主題／全域字體、帳務、schema／Apps Script、備份 v9／封存 v1、OAuth 與旅行內容不變。

## 已實作

- `weatherPresentation` 純品質投影驗 acquired timestamp、resolver city 與有限數字溫度；fresh 年齡為 `0 <= age <10800000`，expired 不回數字。讀取不改原 bytes／t；合法 0 保留，未知 rain 為 null。
- 首頁城市／溫度／日本時間「更新於 HH:mm」與 aria 共用結果；不是氣象站發布時間。只有 fresh 顯示 mood icon。未知不保證適合出發，失敗／過期有非阻擋式摘要與手動重試。
- 每次讀 session 都重新判斷年齡。loading 去重，failed 等手動重試；完成前核對 identity／epoch／active，寫入前守門；僅目前城市及 Today 可重繪。清除 UI 遞增 epoch 並清空 session。
- cache 保存核對 raw readback；拒絕保存仍保留網路取得的 session envelope，只記固定去敏訊息，不冒稱已持久化。
- Open-Meteo `timezone=Asia/Tokyo` 的 offset-free hourly timestamps 以日本時間解讀，非裝置時區；[官方參數文件](https://open-meteo.com/en/docs)說明指定 timezone 時回傳本地時間。保留既有全時段過去時退回當日最大值的雨量演算法。
- 新增天氣 meta／訊息為 11px；重試字體 11px、hit area ≥44px。320／375／390px 截圖確認，不調全域字體或主要操作。

## 驗證（獨立審查待完成）

- 基準 v144：35 browser 通過。Task 1 RED：新 helper 缺失、三項 DOM 行為缺失；Task 2 RED：過期 session 不刷新／無重試按鈕。
- Task 1：109 Node 檔、33 受影響 browser、四項 gate 通過。純品質測試另在 UTC／Asia/Taipei／America/Los_Angeles 均通過。
- Task 2 runtime `b0f88b4`：Node weather／session 與 B persistence 26/26、weather 13/13、受影響 browser 48/48、四項 gate／diff check 通過。
- generator preview → write → readback → preview 一致；v145 asset version 正確，原 seed 八表與 timestamp 深度相等，無網路內容刷新。
- 保護核對：root v110、v143／v144、schema／domain modules、B checked writer／caller／undo、全域 lsSet 不變。
- 完整 Node 109 個測試檔、Chromium 270/270（8.2 分鐘，0 retry）、四項 gate／diff check 全部通過。第一次完整回歸因舊 observer 計時起點失敗中止；修正後從零重跑，未沿用前批或部分結果。
- 一次 fresh-context Astra review：尚待完成，不宣稱可以發布。

## 執行裁定

1. API 小時時間改按日本解讀：RED 證明台灣裝置把已過去的 90% 算入；來源契約支持修正。若判斷有誤，降雨窗口會變動；已跨時區測試。
2. 既有 Shopping／導航矩陣共用 observer 從 DOM highlight 啟動時計時，避免 awaited tap／assertion 消耗生命週期；維持原門檻與 production timers。舊矩陣曾少算到 596–623ms，18/18 專項複驗通過；第一輪完整 QA 有三項同因失敗後中止，重跑不掩飾原失敗。若 fixture 不完整，可能漏測動畫階段；完整回歸仍驗 fade／cleanup。
3. 整批審查範圍從核准的 C 基準 11239e3 起，不重審整條歷史生命週期分支；B 有自己的獨立審查且本批保持不變。若裁定錯誤，舊的無關缺失未重新稽核；C/B 相互影響與完整回歸仍在範圍內。

## 未驗與發布限制

TP145-a～c、iOS／Android 實體 PWA、VoiceOver／TalkBack、真實 Open-Meteo 使用情境仍待驗。OAuth 開放、分類管理、備份檔案、過往旅程列表與連接新旅程未納本批。發布須另外按 repo gate 及 Bar 指示；復原為下一未使用 generation forward-bump，不覆寫前代、不刪 SW 或清個人資料。
