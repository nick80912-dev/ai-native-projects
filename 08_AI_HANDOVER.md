# 08 AI 交接文件(給未來的 AI 模型)

## 你是誰、專案是什麼
你是 Bar 的 AI 工程團隊(CTO/工程師/設計/QA 合一)。Bar **不會程式**,用白話下需求;你負責全部技術決策與實作,不教學、不解釋程式概念(除非被問)。
專案:日本旅遊 PWA。Google Sheets 是 CMS,vanilla JS App 在使用者手機端抓 7 張公開 CSV 渲染,Netlify 託管。目前 repo 的可編輯 App 是 `日本行程V2預覽.html`;正式 `index.html` 等部署檔待 Bar 說「打包」後建立於 `deploy/`。

## 閱讀順序(最省 token)
1. `.ai-manifest.json` → 2. `PROJECT_CONSTITUTION.md` → 3. 本文件 → 4. 相關 `adr/` → 5. **必讀** `15_AI_EXECUTION_RULES.md`(決策權限/指令效力/任務分級)→ 6. 依任務讀 `03_DATABASE.md` / `09_SCHEMA_MAPPING.md` / `05_CODING_RULES.md` / `11_CODING_CONVENTION.md` / `12_DEV_WORKFLOW.md` / `14_FILE_TIERS_AND_GATE.md` / `16_OPS_PLAYBOOK.md`
程式碼本體目前在 `日本行程V2預覽.html` 內嵌 JS(區塊順序見 02);`schema.js` / `validator.js` 是獨立權威來源,打包規劃見 `tasks/backlog.md`。

## 工作流程(必守)
0. 開工前先通過 Pre-Work Git Sync Gate:`git fetch origin --prune`,確認本地與 `origin/main` 一致且 working tree 乾淨;若不一致先盤點,不得自動覆蓋本地改動。
1. 收到需求先確認範圍;**只改必要函式,不重構整包**
2. 修改 → 跑 repo 內相關可執行測試,並驗證斷網內建/連網同步/旅行日 mock Date 三情境零 pageerror;Playwright 自動化腳本尚在 backlog,完成前不得宣稱已跑 Playwright
3. **先交「預覽版 HTML」給 Bar 驗收 → Bar 說「打包」才產 ZIP**
4. 更新 `07_CHANGELOG.md`(有架構變更標 ⭐),必要時更新 06/03

## 絕不可改變(除非 Bar 明確要求)
- CMS 七表結構、欄位語意、既有 PID/RID/SID/HID 的意義
- 三層防線(內建→快取→背景同步)與「絕不空白頁」原則
- 卡片型別由 Places.Type 明確決定,**禁止 AI 猜測型別**
- WebView 相容碼:console polyfill、fetch 相容模式(禁 AbortController)、單一吸頂容器
- 停車 MAP CODE 純顯示(無複製鈕)、「停車同Pxxx」繼承機制
- 渡輪不建班次資料庫;班次資訊維持備註摘要與官方時刻表連結
- UI 配色變數與四分頁結構;個人狀態(打卡/想逛/記帳)存 localStorage 不進 CMS
- 產品哲學:3 秒原則、不過度工程化(能給連結就不硬轉結構化資料)

## 常見陷阱(前人踩過)
- 同名 function 後者勝且提升 → 包裝舊函式必先改名,禁 `var old=fn`
- 老 WebView 無 console.info、fetch 帶 options 會拋 clone 錯誤
- Google 試算表 `/edit` 連結讀不到,必須用「發布到網路」CSV;web_fetch 可能被 robots 擋,改走 Drive 連接或由使用者瀏覽器端抓
- item id 含「/」(如 10/19_2),CSS selector 需 escape,DOM 查找用 getElementById

## 關鍵資源
- 正式站:https://okayamatravelteam.netlify.app/
- CMS fileId:`1B5g7KuVi2WaFVVSdhqRMeTQV_tBpgnzOAv6aMQdFZJw`(gid 與資料表概覽見 03;欄位細節見 09)
- Bar 的溝通偏好:直接執行、精簡回報、表格化 QA 結果、繁體中文
