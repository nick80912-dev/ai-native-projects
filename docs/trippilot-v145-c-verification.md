# TripPilot v145 C 驗證記錄

日期：2026-10-05。Current status authority：`tasks/current.md`。本文件是本批證據與限制，不是發布核准。

## 核准與範圍

Bar 確認 C 四點：保留 B 五筆本機提交、沿用隔離 worktree；v144 → 未使用 v145；原八表 CSV／timestamp；原來源／6500ms timeout／城市 resolver／3h TTL。僅本機實作與提交，未 push、merge 或部署。主題／全域字體、帳務、schema／Apps Script、備份 v9／封存 v1、OAuth 與旅行內容不變。

## 已實作

- `weatherPresentation` 純品質投影驗 acquired timestamp、resolver city 與有限數字溫度；fresh 年齡為 `0 <= age <10800000`，expired 不回數字。讀取不改原 bytes／t；合法 0 保留，未知 rain 為 null。
- 首頁城市／溫度／日本時間「更新於 HH:mm」與 aria 共用結果；不是氣象站發布時間。只有 fresh 顯示 mood icon。未知不保證適合出發，失敗／過期有非阻擋式摘要與手動重試。
- 每次讀 session 都重新判斷年齡。loading 去重，failed 等手動重試；完成前核對 identity／epoch／active，寫入前守門；僅目前城市及 Today 可重繪。清除 UI 遞增 epoch 並清空 session。
- 同一 Today 畫面回到前景／pageshow 也重新核對有效期；單次 deadline 只失效並顯示重試，不背景抓取。局部替換天氣 DOM，保留下一站焦點、不觸碰打卡／進度保存；retry 仍保留原生 Tab 順序。
- cache 保存核對 raw readback；拒絕保存仍保留網路取得的 session envelope，只記固定去敏訊息，不冒稱已持久化。
- Open-Meteo `timezone=Asia/Tokyo` 的 offset-free hourly timestamps 以日本時間解讀，非裝置時區；[官方參數文件](https://open-meteo.com/en/docs)說明指定 timezone 時回傳本地時間。未來有 timestamp 但 rain 全缺時保持 null，不以過去 0% 補值；只有全部可解析時段確實過去才保留既有當日最大值 fallback。
- 新增天氣 meta／訊息為 11px；重試字體 11px、hit area ≥44px。320／375／390px 截圖確認，不調全域字體或主要操作。

## 驗證（本機完成；未推送）

- 基準 v144：35 browser 通過。Task 1 RED：新 helper 缺失、三項 DOM 行為缺失；Task 2 RED：過期 session 不刷新／無重試按鈕。
- Task 1：109 Node 檔、33 受影響 browser、四項 gate 通過。純品質測試另在 UTC／Asia/Taipei／America/Los_Angeles 均通過。
- Task 2 runtime `b0f88b4`：Node weather／session 與 B persistence 26/26、weather 13/13、受影響 browser 48/48、四項 gate／diff check 通過。
- generator preview → write → readback → preview 一致；v145 asset version 正確，原 seed 八表與 timestamp 深度相等，無網路內容刷新。
- 保護核對：root v110、v143／v144、schema／domain modules、B checked writer／caller／undo、全域 lsSet 不變。
- 完整 Node 109 個測試檔、Chromium 270/270（8.2 分鐘，0 retry）、四項 gate／diff check 全部通過。第一次完整回歸因舊 observer 計時起點失敗中止；修正後從零重跑，未沿用前批或部分結果。
- 一次 fresh-context Astra xhigh review，range `11239e3..42b9eaa`：無 Critical、兩項 Important（同頁前景恢复未失效；未來缺降雨被過去 0% 補值）、一項 Minor 文件索引。Important 納入單輪修正，Minor 暫緩，未派第二輪 reviewer。
- Important RED：actual visibilitychange／pageshow 仍留 27°；到期不切頁仍留舊數字；past 0／future null 或空值被呈現 0%／適合出發。補上 expiry 不發請求與 retry 自然 Tab 順序的 RED；QA fake clock 曾覆蓋旅行日期，修正 fixture 後才算有效 RED。
- 最終 runtime `64b66ac0004becf57a7abf5b55818ac13e41f875`：修正後從零重跑 Node 109/109 個測試檔、受影響 browser 53/53（含天氣 18/18）、完整 Chromium 275/275（8.8 分鐘，0 retry）、四項 gate／diff check 全過。UTC／Asia/Taipei／America/Los_Angeles 及保護核對再次通過；兩項 Important 均有 RED→GREEN，不派第二輪 reviewer。
- branch `codex/personal-trip-lifecycle` 與隔離 worktree 保留。未 push／merge／deploy，沒有遠端 CI／正式站／真機完成聲明；C ignored QA 記錄保留，不依流程自動刪除。

## 執行裁定

1. API 小時時間改按日本解讀：RED 證明台灣裝置把已過去的 90% 算入；來源契約支持修正。若判斷有誤，降雨窗口會變動；已跨時區測試。
2. 既有 Shopping／導航矩陣共用 observer 從 DOM highlight 啟動時計時，避免 awaited tap／assertion 消耗生命週期；維持原門檻與 production timers。舊矩陣曾少算到 596–623ms，18/18 專項複驗通過；第一輪完整 QA 有三項同因失敗後中止，重跑不掩飾原失敗。若 fixture 不完整，可能漏測動畫階段；完整回歸仍驗 fade／cleanup。
3. 整批審查範圍從核准的 C 基準 11239e3 起，不重審整條歷史生命週期分支；B 有自己的獨立審查且本批保持不變。若裁定錯誤，舊的無關缺失未重新稽核；C/B 相互影響與完整回歸仍在範圍內。
4. 保留只有全部可解析時段已過去時的 legacy 當日最大 rain fallback；未來有時間但缺 rain 則 unknown。若裁定錯誤，all-past 值仍可能高估現在出門的降雨風險。
5. 不擴張成 response-body transport 重設，保留原 response acquisition 6500ms helper；若 header 已到而 JSON body 停滯，仍可能 loading 超過 6500ms，這是明列的後續限制。
6. 保留 dayIndex＋city.key identity；若裁定錯誤，跨日期同城在 loading 時可另發請求，未實作城市全域 owner。
7. 不猜額外氣象數值界線或 upstream observation 年齡，依手機取得時間與 finite temperature 契約；若裁定錯誤，有限但不合理的溫度／code 仍可顯示。
8. failed 恢復連線不自動重試，入口保持手動；若裁定錯誤，失敗後需按重試或重新開啟 session 才恢復天氣。
9. 舊的非 C 問題／B internals 不進此輪修正，但仍核對 C/B integration 和完整回歸；若裁定錯誤，原有無關缺失會保留。
10. 真機、閱讀器、字體縮放、live provider 不以 Chromium mocks 代驗；若裁定錯誤，平台／真來源差異仍可能要待實機才發現。
11. 未 push／deploy、不宣稱 remote exact-head CI 或 production activation；若裁定錯誤，線上使用者目前還不會拿到 v145。
12. 連續停留 Today 的 one-shot deadline 只使畫面過期／提供重試；foreground／pageshow 才允許一次請求，不加入輪詢或行程 mutation；若裁定錯誤，連續開著需手動重試或回到前景才有新資料。
13. 保留本計畫 ignored QA scratch 與 managed worktree，遵守 repo 未核准不刪除及本機交付規則；若裁定錯誤，約 1.6 MB 本批 QA 檔留在磁碟，但不影響 runtime／個人資料、不動其他計畫 scratch。

## 暫緩 Minor

- `.ai-manifest.json` 的 B 驗證連結誤指向不存在的 `docs/trippilot-v145-b-verification.md`；既有 B 證據在 `docs/trippilot-v144-b-verification.md`、C 在本文件。僅影響交接文件查找、不影響 runtime；依單輪重要修正範圍暫緩，不偷偷納入 polish。

## 未驗與發布限制

TP145-a～c、iOS／Android 實體 PWA、VoiceOver／TalkBack、真實 Open-Meteo 使用情境仍待驗。OAuth 開放、分類管理、備份檔案、過往旅程列表與連接新旅程未納本批。發布須另外按 repo gate 及 Bar 指示；復原為下一未使用 generation forward-bump，不覆寫前代、不刪 SW 或清個人資料。
