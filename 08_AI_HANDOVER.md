# 08 AI 交接文件(給未來的 AI 模型)

## 你是誰、專案是什麼
你是 Bar 的 AI 工程團隊(CTO/工程師/設計/QA 合一)。Bar **不會程式**,用白話下需求;你負責全部技術決策與實作,不教學、不解釋程式概念(除非被問)。
專案:日本旅遊 PWA。Google Sheets 是 CMS,vanilla JS App 在使用者手機端抓 8 張公開 CSV 渲染,Netlify 託管。`index.html` 是 UI、DOM adapter 與正式部署入口；獨立 runtime modules 由 `runtime-assets.json` 登錄，包含 Buy-to-Ledger、Ledger/Shopping UI state 與 Trip progression。`schema.js`、`validator.js`、`sw.js` 等部署檔均在 repo 根目錄,經 GitHub 連動由 Netlify 部署(流程見 16 §E)。

## 接手第一步:Project Understanding Report(先說理解,再動手)
任何 AI 首次接手本專案、或在無既有專案脈絡的新對話/新環境開工時,完成下方閱讀順序後**不得直接修改任何檔案**,必須先輸出理解報告並等 Bar 核准(例:「確認,可以開始實作」)。此要求是「每個 AI 接手時做一次」,不是每個任務都做;同一脈絡內的後續任務依 15 的任務分級與 14 的 Tier 規則執行。

報告模板(全 repo 唯一版本,他處不得另立):
1. 專案目的(我的理解)
2. 已閱讀文件 / 未閱讀文件與原因
3. 目前架構與 Data Flow 摘要
4. 本次任務範圍(Scope)
5. 受影響模組 / 不應觸碰的模組
6. 是否涉及 Schema / ADR / 憲章(各 Yes/No + 說明)
7. 潛在風險與回滾方式
8. 提議方案與預估修改檔案清單
9. 資訊是否足夠開始?缺什麼?

## 閱讀順序(最省 token)
1. `.ai-manifest.json` → 2. `PROJECT_CONSTITUTION.md` → 3. 本文件 → 4. 相關 `adr/` → 5. **必讀** `15_AI_EXECUTION_RULES.md`(決策權限/指令效力/任務分級)→ 6. 依任務讀 `03_DATABASE.md` / `09_SCHEMA_MAPPING.md` / `05_CODING_RULES.md` / `11_CODING_CONVENTION.md` / `12_DEV_WORKFLOW.md` / `14_FILE_TIERS_AND_GATE.md` / `16_OPS_PLAYBOOK.md`
程式碼本體主要在 `index.html` 內嵌 JS(區塊順序見 02)；`buy-to-ledger.js`、`ledger-ui-state.js`、`shopping-ui-state.js`、`trip-progression.js` 是 production-used module seams，`schema.js` / `validator.js` 是獨立權威來源。

## 工作流程(必守)
0. 開工前先通過 Pre-Work Git Sync Gate:`git fetch origin --prune`,確認本地與**目前工作分支**(日常 = `origin/dev`)一致且 working tree 乾淨;若不一致先盤點,不得自動覆蓋本地改動。
1. 收到需求先確認範圍;**只改必要函式,不重構整包**
2. 修改 → 跑 repo 內相關可執行測試，並以 `npm run test:browser` 驗證斷網內建／連網同步／旅行日 mock Date 三情境零 pageerror；Playwright 規格位於 `tests/browser/` 並已掛入 `qa.yml`
3. 交付於 `dev` 分支,Bar 驗收後;正式發版依 16 §E(PR → Bar Merge → Netlify 自動部署)
4. 更新 `07_CHANGELOG.md`(有架構變更標 ⭐),必要時更新 06/03

## 絕不可改變(除非 Bar 明確要求)
- CMS 八表結構、Schema 2.9 欄位語意、既有 PID/RID/SID/HID 的意義；Ledger 固定 21 欄，`time` 為消費發生時間，末五欄為輸入幣別、免稅品、價格方式、稅率與優惠券金額
- 三層防線(內建→快取→背景同步)與「絕不空白頁」原則
- 卡片型別由 Places.Type 明確決定,**禁止 AI 猜測型別**
- WebView 相容碼:console polyfill、fetch 相容模式(禁 AbortController)、單一吸頂容器
- 停車 MAP CODE 純顯示(無複製鈕)、「停車同Pxxx」繼承機制
- 渡輪不建班次資料庫;班次資訊維持備註摘要與官方時刻表連結
- UI 的語意角色與今天／行程／購物／分帳四分頁結構不可任意改變；主題只可透過 `data-theme` 覆寫 13 個第一層 `--t-*` token，第二層 `--paper`／`--card`／`--sea-deep`／`--sea`／`--coral` 等角色名稱維持不變。主導覽與設定入口用 inline SVG，內容 Emoji 與桃子診斷徽章保留，不引入 icon font。
- 個人狀態（打卡／想逛／成員身分）、個人帳、代購對象、`themeId` 與 `travelNotes` 只存 localStorage、不進 Queue、CMS 或雲端 Schema；主題、採買單位與旅途紀錄自個人備份 v8 起一併匯出／還原。團體帳一律走 Ledger Repository 跨裝置同步，兩軌資料與統計不得混用。依 ADR 0006，App 只可 append「分帳紀錄」並更新 TripConfig 的 `Exchange Rate` / `Ledger Default Currency`，其餘 CMS 欄位維持 Bar 手動管理且 App 唯讀
- 產品哲學:3 秒原則、不過度工程化(能給連結就不硬轉結構化資料)

## Ledger Schema 2.9 現行契約
- 團體新增與編輯都先透過 `enqueueBatch(records)` 一次耐久寫入本機 Queue，入列成功即完成 UI 儲存並背景送達；不可改回等待 Apps Script POST 才關閉表單。公開 CSV 跨裝置可見延遲 1–5 分鐘是已接受取捨。
- TEST 模式是獨立平行帳本：開啟時團體儀表板、今日、結算與明細只計算 `[TEST]`，關閉時只計算正式資料；個人帳不受 TEST 模式影響。
- 個人編輯可原地替換本機紀錄。尚未落入 canonical 還款確認切點的團體收據，編輯時 append 舊筆墓碑（原因固定「編輯修改」）與新替代筆，新筆以 `replacesRecordId` 指向原紀錄。
- canonical 還款確認成立後，切點前既有團體收據永久禁止直接編輯／刪除；全團餘額歸零不解除保護。只有原付款人可用引導式流程整張追加更正或作廢，付款人不可變，更正原因必填。
- 更正使用 `expense_correction_item` + `expense_correction_commit`，作廢使用 `expense_void_commit`；資料仍沿用固定 21 欄，不新增 Sheet 欄位或 Apps Script API。item 先入列、commit 最後入列；缺件版本不得生效，歷史與 losing conflict 永久保留。
- 更正送出前必須顯示品項變更、受影響成員與餘額差；已結清團體因更正重新出現餘額時，舊還款確認維持完成並建立新的待結算餘額。詳細規格見 `docs/superpowers/specs/2026-07-29-settlement-consistency-guided-correction-design.md`。

## 常見陷阱(前人踩過)
- 同名 function 後者勝且提升 → 包裝舊函式必先改名,禁 `var old=fn`
- 老 WebView 無 console.info、fetch 帶 options 會拋 clone 錯誤
- Google 試算表 `/edit` 連結讀不到,必須用「發布到網路」CSV;web_fetch 可能被 robots 擋,改走 Drive 連接或由使用者瀏覽器端抓
- item id 含「/」(如 10/19_2),CSS selector 需 escape,DOM 查找用 getElementById

## 現行診斷契約（2026-08-09）
- `AppLog` 六類方法仍輸出既有 console level／前綴，並只在記憶體保存本次 session 最新 100 筆；每筆訊息最多 1,000 字，`snapshot()` 不暴露內部可變狀態。
- `currentHealthFindings()` 是診斷面板的無副作用讀取；`window.healthCheck()` 才會輸出健康報告並寫入 AppLog。單純開啟面板不得製造新紀錄。
- 桃子診斷面板可顯示、複製與清除 AppLog；不得將紀錄改存 localStorage、IndexedDB、備份或遠端，也不得恢復已退役的 iOS 手勢事件收集。
- 診斷面板已移除團體帳測試模式區塊；設定頁控制、TEST 前綴及正式／TEST universe 隔離仍是現行能力，不得連帶刪除。

## 關鍵資源
- 正式站:https://trippilot-jp.netlify.app/
- 測試站:https://dev-trippilot-jp.netlify.app/
- CMS fileId:`1B5g7KuVi2WaFVVSdhqRMeTQV_tBpgnzOAv6aMQdFZJw`(gid 與資料表概覽見 03;欄位細節見 09)
- Bar 的溝通偏好:直接執行、精簡回報、表格化 QA 結果、繁體中文
