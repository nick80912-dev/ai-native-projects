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
- **閉環（Buy-to-Ledger Loop）**：採買項目標記已買後，可直接帶入既有單筆或多品項記帳表單；只負責預填與開啟，不改變記帳流程。來源 `sourceShoppingItemIds` 只是 draft 上的 ephemeral state，不進 Ledger 21 欄、不送 Apps Script、不入 Google Sheet。
- **記帳關聯（ledgerLinks）**：每個採買項目持有一個 append-only 的 `ledgerLinks[]`，**只有最後一個 link 代表目前關聯**，舊 link 永遠只是歷史、不會復活。用陣列而非單一物件，是因為「解除後再記一次」必須保留原本解除過哪一筆的稽核線索。每個 link 只保存自己那一筆 `recordId`；多品項共用同一 `batchId`，但不得讓每個項目保存整批的 recordIds。**不持久化任何 status 字串。**
- **`releasedAt`（改回未記帳）**：使用者主動解除採買項目記帳關聯的**事實**，不是 UI 狀態——它無法從 Ledger 推導，因此必須落地。只更新最後一個尚未解除的 link，不刪 link、不清 `recordId`／`batchId`／`linkedAt`、不動原 Ledger 紀錄。已解除者不重複寫入；沒有 active link 時不提供入口。
- **記帳三態**：`linked`（已記帳）／`unverified`（記帳狀態待確認）／`unlinked`（未記帳），一律由目前 Ledger、durable queue、delivery bridge、replacement 與 tombstone 動態推導。團體紀錄安全寫入 durable queue 即算 `linked`，不必等 Google Sheet 回讀。**「找不到 record」不等於已刪除**——離線、資料未載入、bridge 未收斂、TEST／正式宇宙不符、目前成員可見性差異都只能降級為 `unverified`：阻擋再次記帳、不清除 link、不自動寫 `releasedAt`。只有「原紀錄仍在事件流中、但已被有效墓碑刪除且無有效 replacement」才是確定失效。推導一律讀 `mergedLedgerRecords()`，不得讀已套用「與我相關」過濾的 `ledgerTrackRecords()`。採買側的 link 是防重複入帳的輔助，**不是 Ledger 的安全或授權邊界**。
- **部分購買拆分**：原需求拆成「已買部分」與「剩餘待買部分」。**原 item ID 成為已買部分**，剩餘部分取新 ID 並插在 store array 的正後方（用 `add()` append 會讓剩餘項目跳到群組尾端）。`splitGroupId = 既有 splitGroupId || 來源 id`，重複拆分沿用同一個。兩筆都沿用原 `createdAt`。不保存 `originalQty`，不新增 `splitFromId`／`splitAt`，不建立完整拆分樹。已記帳或狀態待確認的項目不得拆分。
- **採買列資訊分層**：固定三層——品名／屬性（`分類 · 數量 · 幫誰買`，以 `·` 分隔，數量不加「數量」前綴）／地點（`DAY N · 站名`，獨立一行）。動作收進 `⋯` 選單（沿用帳本的 `.ledger-action-popover`，z-index 155 高於採買 overlay 的 145），**只有「記帳」留在列上**——買到→記帳是主流程，不該多一次點擊；`改回未記帳`／`部分買到`／`編輯`／`刪除` 都是低頻，收進選單同時多一層誤觸防護。選單內容依三態決定：`linked` 給改回未記帳、`unlinked` 且未完成給部分買到、`unverified` 兩者都不給。
- **採買數量（結構化）**：`quantity` 為安全正整數（最小 1，不允許 0／負數／小數／`NaN`／`Infinity`／超出 `MAX_SAFE_INTEGER`），`unit` 獨立保存（正規化空白、**最多 6 字**、可自訂）。單位上限與設定頁選項共用的 `normalizeLedgerOption()` 對齊，避免「表單存得下、設定頁加不進去」兩套規則。表單的單位是**下拉選單**並與數量並排同一列；選項來自 `shoppingUnitStore`（沿用泛用的 `createLedgerOptionStore`，key `trip_shopping_units`），**新增單位改到設定頁「自訂類別、支付方式與採買單位」**。若項目目前的單位不在清單內（使用者曾自訂或舊 `qty` migration 帶出），下拉會補一個以自身為值的選中 option 標示「（自訂）」，不主動改就不會被靜默改掉。新項目數量**不再選填**，預設 1。表單只接受純十進位數字字串——`type="number"` 在部分瀏覽器仍會送出 `1e6`／`+3`，直接 `Number()` 會把 `1e6` 悄悄變成一百萬。
- **`legacyQtyText`**：只承接無法安全轉換的舊式自由文字。舊 `qty` 僅在「正整數＋可選單一空白＋不含數字與空白的單位」時自動轉換（`5 罐`／`5罐`／`10`）；`兩盒`、`約 3～5 個`、`3-5 個`、`家庭號 2 包`、`一組` 一律原文保留於 `legacyQtyText` 且 `quantity` 為 `null`——**不猜中文數字、不從字串中間擷取數字、不取區間端點、不默認成 1**。`quantity` 有值時 `legacyQtyText` 一律清空，不維護兩份可能互相矛盾的數量。正規化輸出**不再帶 `qty` 鏡像**，避免第二個可獨立修改的數量來源。
- **`shoppingQuantityLabel()`**：所有數量顯示的唯一入口（清單、Today 提醒、Ledger note、拆分表單、編輯表單）。`quantity` 有值時輸出 `5 罐`／`3`，否則輸出 `legacyQtyText`，都沒有則空字串。任何位置不得自行拼接數量。
- **部分購買的數量計算**：使用者只輸入「本次買到」，剩餘由 `shoppingSplitPlan()` 計算並即時預覽。買到量 < 1 或 > 原需求一律阻擋；**等於原需求時直接走「全部買到」，不建立 0 數量的剩餘項目**。`unit` 由原項目繼承。`quantity` 為 `null` 的舊式項目不得部分購買，必須先在編輯表單轉為數字與單位。
- **`completedAt`**：實際完成時間。首次標記已買時寫入、移回待買時清空、再次完成時重寫、部分購買的已買部分於拆分當下寫入。舊資料缺欄補空字串，`done` 為 true 但無 `completedAt` 屬 legacy 降級，不得自行編造時間。順序分工：store array order 決定清單位置、`completedAt` 表示購買時間、`splitGroupId` 表示同源需求。**`createdAt` 不是購買時間。**
- **單筆記帳入口**：完成商品後不強制詢問記帳（B 批裁定），但單筆記帳功能沒有取消——入口移到**已買項目列**。只有 `unlinked` 顯示「記帳」（直接呼叫既有 `openShoppingLedgerEntry()`），`linked` 顯示「改回未記帳」，`unverified` 兩者都不提供（必須阻擋再次記帳）。顯示條件一律走共用 resolver，不得以 `ledgerLinks.length` 判斷。
- **自動改回未記帳**：記帳狀態是每次重繪即時推導，不是存下來的。**把帳本那筆刪掉，採買項目會自動變回「未記帳」**，不需要按任何東西（個人帳 → 讀不到即為權威；團體帳 → 有效墓碑且無 replacement）。手動的「改回未記帳」只補自動化決定不了的兩格：`unverified`（找不到但不能證明已刪除）、以及「消費是真的、只是連錯採買項目」。因此選單只在 `linked` 提供它。**絕不可改成「找不到就自動當作已刪除」**——離線一次就會把所有已記帳項目洗成未記帳，再記一輪即全套重複入帳。
- **個人狀態備份 v6**：Shopping Item 於 v5 新增 `completedAt`／`splitGroupId`／`ledgerLinks`，v6 再改為結構化 `quantity`／`unit`／`legacyQtyText`。若仍輸出 v4，舊版 App 會認為格式相容，還原時經舊 normalizer 靜默丟掉這三個欄位，已記帳項目會重新顯示成未記帳而導致重複入帳。v1～v6 皆可還原並補預設值，未知的未來版本必須明確拒絕（含型別檢查，字串 `'6'` 不通過）；`trip_shopping_list` key 不變，不做整批預先 migration，每次 read 經 normalizer 補欄、寫回時自然升格。
- **代購對象共用名單**：採買表單與 Ledger 代購表單共用 `trip_ledger_proxy_targets`，任一入口新增後另一入口立即可見並依既有規則去重。
