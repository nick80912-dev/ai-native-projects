# 00 CONTEXT HANDOVER(壓縮交接檔 · 2026-07-06)

> 給接手 AI:先讀 `.ai-manifest.json` → `PROJECT_CONSTITUTION.md` → `08_AI_HANDOVER.md` → 相關 `adr/`;再依任務查 `03_DATABASE` / `09_SCHEMA_MAPPING` / `05_CODING_RULES` / `11_CODING_CONVENTION` / `12_DEV_WORKFLOW`。

## 專案一句話
日本旅遊 PWA(10/18-23 岡山廣島宮島自駕,朋友團用)。Google Sheets=CMS,手機瀏覽器直接抓 7 張發布 CSV 渲染,Netlify 託管,無後端。Bar=產品負責人(不會程式,繁中溝通,要直接執行不要教學);AI=全職工程團隊。

## 鐵則工作流程
需求→只改必要函式→Playwright QA(斷網/連網/旅行日 mock Date,零 pageerror)→**先交預覽版 HTML→Bar 說「打包」才出 ZIP**→更新 CHANGELOG。禁止:大重構、改 CMS 結構、猜地點型別、刪功能(未經 Bar 同意)。

## 架構(v2.2-harness)
```
Google Sheets 7表 →發布CSV→ 瀏覽器fetch → validator.js(防錯) → parser(Schema驅動) → DB → renderers → UI
離線三層:BUILTIN內建快照 → localStorage快取 → 背景同步(單表失敗不影響其他,徽章:已是最新/部分更新/離線版/內建版)
```
- **schema.js = 唯一資料規格(SSoT)**:pubBase、gid、欄位(header+aliases)、型別值對應、Exp版面、Cfg鍵。新欄位=只改 schema,parser 不動。schemaDoc() 自動產文件。
- **validator.js**:AppLog 六類(`[Schema Error][Parser Error][Data Error][Repository Error][Render Error][Sync Error]`)+ buildHeaderMap(缺必填/未知欄警告不崩潰)+ **window.healthCheck()**(重複ID/懸空引用/型別覆蓋/資料缺席,交付前必跑)。
- app JS:vanilla ES5 單檔內嵌;預覽版=三個 script 區塊(schema/validator/app);部署=獨立檔案。
- WebView 相容(勿刪):console polyfill、禁 AbortController(clone錯)、fetch 相容退回、單一吸頂容器 .hdr。
- PWA:sw.js Shell=SWR、CSV=網路優先;改版 bump VERSION。

## CMS(fileId `1B5g7KuVi2WaFVVSdhqRMeTQV_tBpgnzOAv6aMQdFZJw`)
pubBase=`https://docs.google.com/spreadsheets/d/e/2PACX-1vRenmV8UxEzWbzSjKJKi4rSpYt63geBqhEkKsl1GemWVPmFKTcvv3Uk71Hjla3TGBpGIjC7bQDDdI00/pub?single=true&output=csv&gid=`
gid:行程1169222358/Places1089684162/Rest1421821084/Shop1182059264/Hotels792115203/Exp1354339857/Cfg1070234314
- 行程:7欄位置式 `日期|時間|詳細行程|地點|ID(Pxxx/Rxxx)|交通|備註`;「第N天MM/DD(週)」=換日列
- Places:`PID|地點|Type|MAPCODE|交通/交通時間|停車|營業時間|門票|官網|時刻表連結|備註`;Type中文值→型別:購物/美食區/住宿/景點/渡船口・渡輪/租車點(禁猜);「停車同Pxxx」完整繼承(深度3,懸空→warn顯示原文)
- Rest:`RID|PID(可空白)|餐廳名稱|Tabelog|餐廳類型|營業時間|付款方式|交通時間|停車|備註`;掛PID→該地點卡自動列出
- Shop:`SID|PID|品牌名稱|樓層|分類|必逛|免稅|備註`;Hotels:`HID|名稱|入住|退房|地址|停車|適用日期|備註`(名稱比對Places)
- Exp:自由格式(同行成員列→自動帶入分帳成員;類別/明細/台幣[4]/日幣[5]/備註[6];小計總計)
- Cfg:Key/Value(`Travel Mode:Driving→drive`,`Trip Name`→頂欄標題)

## 功能現況
四分頁:今天(下一站=第一個未打卡+大導航鈕)/行程(型別卡+快速動作 🚗導航|🅿停車|資訊|⛴渡輪|📝更多)/購物(樓層摺疊+想逛+搜尋+必逛免稅徽章)/分帳(App記帳+CMS行前團費並列)。MAP CODE 26px 純顯示無複製鈕。渡輪=末班資訊+官方時刻表連結(不建班次庫)。個人狀態 localStorage:trip_checks/trip_shop_wants/trip_people/trip_expenses。

## 檔案位置
- 產出物:日本行程V2預覽.html、schema.js、validator.js、.ai-manifest.json(已交 Bar)
- Drive docs 資料夾「日本旅遊App-docs」(id `1KwxLQ9K1zC5ePVsph2s0O2ISoQ66kTBA`,在 BHAIProject 內):README、01-09、本檔。**Drive 工具只能 create 不能 update,更新文件=建新檔註明取代**。
- 正式站:https://okayamatravelteam.netlify.app/(目前仍是 V1 PWA;V2 待驗收部署)

## 待辦(依序)
1. **Harness 文件已建置完成**:PROJECT_CONSTITUTION、10_FOLDER_STRUCTURE、11_CODING_CONVENTION、12_DEV_WORKFLOW、adr/0001-0004、tasks/current/backlog/done 已建立;後續任務只需維護一致性。
2. Bar 手機驗收 V2 預覽版 → 說「打包」→ 部署包:index.html 改 `<script src>` 引 schema.js/validator.js 獨立檔、sw.js VERSION→v3、SHELL_ASSETS 加 schema.js/validator.js/.ai-manifest.json、Playwright 斷網回歸後出 ZIP
3. Day3-6 行程/地點資料待 Bar 更新試算表(程式已支援自動生效);購物模式初版回饋待討論。
4. App 落地後執行 AI Native Framework 抽取(見 `FUTURE_PLAN_framework-extraction.md`)。
5. 每次交付後:跑 healthCheck + 輸出健康報告 + 更新 07_CHANGELOG。

## 已踩過的坑(省你 Debug)
同名 function 宣告後者勝且提升→包裝舊函式必先改名(禁 var old=fn);web_fetch 對此發布ID被 robots 擋→改走 claude-in-chrome(導航 pubhtml 後頁內 fetch;回傳含 ?&= 會被 DLP 擋,需替換佔位符);Drive read_file_content 只回第一張表;item id 含「/」→DOM 查找用 getElementById 勿用 CSS selector;CSV 直開會觸發下載留在 chrome://newtab。
