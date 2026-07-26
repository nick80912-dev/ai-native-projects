# 專案詞彙表

本檔供 AI 與協作者快速掌握專案內的固定術語、資料語意與互動裁定；遇到新的跨功能概念時持續補充，避免各批次使用不同名稱描述同一件事。

## 既有核心詞條

- **墓碑刪除**：不直接改寫或移除雲端原紀錄，而是追加指向原紀錄的刪除紀錄，讓各端以 append-only 歷程重建有效狀態。
- **雙軌（個人／團體）**：Ledger 的兩種帳務範圍；個人帳留在本機，團體帳走既有 Apps Script 與共用 Ledger 契約。
- **身分註冊紀錄**：明細為 `[身分註冊]`、用來建立團體成員名單來源的專用 Ledger 紀錄；不等同一般消費。
- **最大餘數法**：分攤整數金額時先取各份額整數，再依小數餘額由大到小補足差額，確保分攤總和等於原金額。
- **原子快照**：多份 Google Sheet 資料須通過同一批驗證後才整批替換；任一必要資料失敗時不發布混合版本。
- **觀測者效應（no-op dblclick）**：iPhone 相容性 workaround；保留 passive、無副作用的 `dblclick` 監聽器，避免診斷或阻擋手勢本身改變問題。
- **父子行程卡**：父站點統整其連續子站點的行程呈現與完成狀態，Today 與行程頁需沿用同一群組關係。
- **Scroll-only**：Modal／Sheet 只允許內容捲動，不以 JavaScript 實作滑動關閉或手勢攔截；觸控行為由 CSS `touch-action` 管理。
- **封閉集合／開放集合（segmented vs chips）**：互斥且選項固定的狀態使用 segmented control；可多選或可擴充的選項使用 chips。

## 結算同步詞條

- **消費紀錄擁有權（Ledger Ownership）**：團體消費的編輯與刪除限 `record.member`（付款人）。此機制防的是誤操作，不是安全授權：`currentMember` 存於 localStorage 可被修改，Apps Script 端亦接受任何合法 POST；未來不得在此層之上疊加信任假設。
- **交付橋接（delivery bridge）**：POST 已被伺服器接受、但遠端 read model 尚未讀回同一 `record.id` 的空窗期,由本機持久化保存完整 record 的機制。交接是原子的:先寫入 bridge 並確認成功,才可把 record 移出 retry queue;只有遠端讀回相同 id 才清除,不因等待過久自動刪除。
- **事件全序（stable total order）**：所有結算事件一律以 `record.time` ASC → `record.id` ASC 比較。generation close 因此是可比較的 terminal event position `{time,id}`,而非單純時間字串 —— 同毫秒的 reject 與新 claim 才不會讓新付款靜默失效。
- **generation**：同一 `universe + 付款人 + 收款人 + 幣別` 下的一輪結算。由 claim 開啟,由 confirm／reject／withdraw 終結;只有明確在 terminal event 之後的新 claim 才開啟下一輪。主面板只顯示每個 key 的最新可操作 generation,較舊者進歷史。
- **canonical／losing response**：同一 claim 收到多筆有效回覆時,`(time,id)` 最小者為 canonical,其餘為 losing response —— 一律 inert(不影響餘額、不進正式歷史),只留 diagnostic warning。
- **加速層（fast pull）**：Apps Script 唯讀 `doGet` 的 ledger 單表增量讀取。定位是加速層而非取代層:其餘 7 張表維持既有 CSV 原子快照節奏,且 `doGet` 資料必須走與 CSV 相同的正規化管線;失敗一律靜默降級回 CSV。
- **簡易結算模式**：個人裝置的本機開關,只關閉交握 UI 與面板高頻 polling,不改變資料語意 —— 已確認的 settlement 仍照常計入餘額。

## 採買清單詞條

- **地點已知／未知項目**：有 `stopRef` 且綁定現有行程站點者為地點已知；沒有 `stopRef` 者為地點未知，只留在完整清單的「隨時可買」區。
- **行程站點排名（shopping stop rank）**：採買清單顯示站點群組的唯一排序來源，契約為 `dayIndex ASC → 該日 day.items index ASC`，也就是實際走行程的順序。待買頁與 Today 提醒共用同一份排名，不得各自實作；同一站點內的採買項目維持既有 store order，排序只作用於顯示層，不重寫本機資料順序。已買頁不在此契約範圍——目前 Shopping Item 沒有 `completedAt`，其 store order 不等於購買時間順序。
- **行程資料權威性（trip dataset authority）**：能否宣告某個 `stopRef` 失效的前提。只有 `CURRENT_SNAPSHOT.source === 'online'`（來自本次旅程 Google Sheet，含同步後離線沿用的持久化快照）且行程有日資料時為 `authoritative`；`builtin` 與 `legacy-migrated` 一律 `unverified`。內建種子資料日期與日數看起來完整卻不保證是本次旅程，不得以「有幾天資料」推定可信。判定沿用資料層既有的 snapshot source（與 `syncStatusModel()` 同一組值），採買模組不另造平行狀態。
- **孤兒引用三態**：採買項目 `stopRef` 查不到站點時分三種——`resolved`（查得到，正常顯示 `DAY N · 站名`）、`pending`（資料未就緒或來源不可信，顯示中性的「行程站點待確認」）、`orphan`（已確認使用本次旅程權威資料且站點確實不存在，顯示「原行程站點已不存在」並提供修復入口）。任何情況都不自動清除或修改 `stopRef`；清除綁定必須由使用者明確操作。編輯表單在 `pending`／`orphan` 時以原值作為選中的 option，畫面狀態不得與 form state 矛盾。
- **閉環（Buy-to-Ledger Loop）**：採買項目標記已買後，可直接帶入既有單筆或多品項記帳表單；只負責預填與開啟，不改變記帳流程。
- **代購對象共用名單**：採買表單與 Ledger 代購表單共用 `trip_ledger_proxy_targets`，任一入口新增後另一入口立即可見並依既有規則去重。
