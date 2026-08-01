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
- **全站繁中字型鏈**：介面以 Google Fonts `Noto Sans TC` 400／500／700 為第一順位，並使用 `display=swap`；fallback 固定為 `"PingFang TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif`。不得把 Hiragino／Noto Sans JP／Yu Gothic 等日文字型放回 UI font stack，也不得為外部字型另改 Service Worker 快取策略；網路字型失敗或離線時必須可直接退回系統繁中字型。

## 結算同步詞條

- **消費紀錄擁有權（Ledger Ownership）**：團體消費的編輯、刪除與引導式更正限 `record.member`（原付款人）。此機制防的是誤操作，不是安全授權：`currentMember` 存於 localStorage 可被修改，Apps Script 端亦接受任何合法 POST；未來不得在此層之上疊加信任假設。
- **交付橋接（delivery bridge）**：POST 已被伺服器接受、但遠端 read model 尚未讀回同一 `record.id` 的空窗期,由本機持久化保存完整 record 的機制。交接是原子的:先寫入 bridge 並確認成功,才可把 record 移出 retry queue;只有遠端讀回相同 id 才清除,不因等待過久自動刪除。
- **事件全序（stable total order）**：所有結算事件一律以 `record.time` ASC → `record.id` ASC 比較。generation close 因此是可比較的 terminal event position `{time,id}`,而非單純時間字串 —— 同毫秒的 reject 與新 claim 才不會讓新付款靜默失效。
- **generation**：同一 `universe + 付款人 + 收款人 + 幣別` 下的一輪結算。由 claim 開啟,由 confirm／reject／withdraw 終結;只有明確在 terminal event 之後的新 claim 才開啟下一輪。主面板只顯示每個 key 的最新可操作 generation,較舊者進歷史。
- **canonical／losing response**：同一 claim 收到多筆有效回覆時,`(time,id)` 最小者為 canonical,其餘為 losing response —— 一律 inert(不影響餘額、不進正式歷史),只留 diagnostic warning。
- **加速層（fast pull）**：Apps Script 唯讀 `doGet` 的 ledger 單表增量讀取。定位是加速層而非取代層:其餘 7 張表維持既有 CSV 原子快照節奏,且 `doGet` 資料必須走與 CSV 相同的正規化管線;失敗一律靜默降級回 CSV。
- **簡易結算模式**：個人裝置的本機開關,只關閉交握 UI 與面板高頻 polling,不改變資料語意 —— 已確認的 settlement 仍照常計入餘額。
- **還款確認**：收款方確認兩人之間的一筆實際還款已收到；它是局部、不可改寫的歷史事實，不代表全體成員已無應收或應付。
- **團體結算完成**：套用所有已確認還款後，團體內每位成員在結算幣別的應收與應付均為零。這是全團狀態，不是單一消費或單一 pair 的屬性。
- **結算歷史最終性**：收款方已確認的還款是不可改寫的歷史事實；後續發現原消費有誤時，以新的更正事實形成新餘額，不撤銷舊還款確認或重寫既有歷史。
- **引導式更正**：已受結算保護的原消費不直接編輯或刪除；使用者輸入正確版本，由系統追加可稽核的更正事實並形成新餘額，原消費與既有結算保持不變。更正不得改變付款人；付款人記錯時，由原付款人作廢舊收據，再由實際付款人新增正確收據。
- **收據級更正**：同一張多品項收據以整張為更正單位；一次開啟完整正確版本，可修改、新增或移除品項，並形成同一組更正歷史。單品項收據則以該筆為更正單位。
- **作廢更正**：已受結算保護的整張收據若實際不應存在，以附理由的更正事實抵銷其全部帳務影響；原收據、既有還款確認與稽核歷史均保留，不建立刪除墓碑。
- **更正版本鏈**：每次更正都以前一個最新有效版本為基準，追加下一個完整版本並只形成兩版之間的帳務差額；原始版本與所有舊版本永久保留，不可回頭修改或刪除。
- **更正保護切點**：一筆 canonical 還款確認成立後，該還款請求建立前已存在於同一帳務範圍的團體收據，永久改為只能更正；多品項收據只要任一品項落在切點前，整張一起保護。正式帳與 TEST 帳分開判定，切點後的新收據仍可直接編輯或刪除，直到後續還款確認把它納入保護。
- **canonical 更正**：多台裝置對同一上一版本並行提交更正時，以穩定事件全序選出唯一有效版本；其餘衝突更正不影響餘額、不自動升格，只保留稽核與診斷資訊。
- **結算週期**：從前一輪團體結算完成後的新消費開始，至下一次全團應收與應付歸零為止。週期關閉後，該週期的消費永久受更正保護；不因全團歸零而重新開放直接編輯或刪除，後續新消費進入新的結算週期。

## 採買清單詞條

- **地點已知／未知項目**：有 `stopRef` 且綁定現有行程站點者為地點已知；沒有 `stopRef` 者為地點未知，只留在完整清單的「隨時可買」區。
- **行程站點排名（shopping stop rank）**：採買清單顯示站點群組的唯一排序來源，契約為 `dayIndex ASC → 該日 day.items index ASC → exact category === '必買' 穩定置頂`。待買頁四類群組與 Today 提醒共用同一份排名／partition，不得各自實作；必買與非必買各自維持既有 store order，排序只作用於顯示層，不重寫本機資料順序。已買頁不在此契約範圍——Shopping Item 雖有 `completedAt`，目前頁面仍維持 store order，未承諾依購買時間排序。
- **行程資料權威性（trip dataset authority）**：能否宣告某個 `stopRef` 失效的前提。只有 `CURRENT_SNAPSHOT.source === 'online'`（來自本次旅程 Google Sheet，含同步後離線沿用的持久化快照）且行程有日資料時為 `authoritative`；`builtin` 與 `legacy-migrated` 一律 `unverified`。內建種子資料日期與日數看起來完整卻不保證是本次旅程，不得以「有幾天資料」推定可信。判定沿用資料層既有的 snapshot source（與 `syncStatusModel()` 同一組值），採買模組不另造平行狀態。
- **孤兒引用三態**：採買項目 `stopRef` 查不到站點時分三種——`resolved`（查得到，正常顯示 `DAY N · 站名`）、`pending`（資料未就緒或來源不可信，顯示中性的「行程站點待確認」）、`orphan`（已確認使用本次旅程權威資料且站點確實不存在，顯示「原行程站點已不存在」並提供修復入口）。任何情況都不自動清除或修改 `stopRef`；清除綁定必須由使用者明確操作。編輯表單在 `pending`／`orphan` 時以原值作為選中的 option，畫面狀態不得與 form state 矛盾。
- **採買分配（shopping allocation）**：Shopping Item 的對象、數量與記帳關聯以 `allocations[]` 保存；每筆含穩定 `allocationId`、`target`、安全正整數 `quantity` 與 append-only `ledgerLinks[]`。沒有代購對象時仍只有一筆 `target:''` 的「自己」分配；自己不可與代購對象混用，對象以 `canonicalMemberName()` 去重。新建多對象目前用同一個每人數量，但資料契約允許不同 allocation 有不同數量，未來開放逐人輸入不需再次 migration。
- **閉環（Buy-to-Ledger Loop）**：採買項目標記已買後，可直接帶入既有單筆或多品項記帳表單；每個未記帳 allocation 對應一筆 Ledger 品項並自動帶入該 `target`。來源 `sourceShoppingItemId` 與 `sourceShoppingAllocationId` 是 track-neutral 的 draft identity，必須跟著原單筆／逐項 key 穿越個人↔團體切軌，刪除某列只移除該列來源；它們仍只是 ephemeral state，不進 Ledger 21 欄、不送 Apps Script、不入 Google Sheet。切軌同時保留逐項 `isProxy`／`proxyTarget` 與 `participantMode`／`participants`，但提交時永遠只序列化目前帳本軌的欄位，不做代購對象與團體分攤成員的互相映射。
- **記帳關聯（ledgerLinks）**：每個 allocation 持有一個 append-only 的 `ledgerLinks[]`，**只有最後一個 link 代表目前關聯**，舊 link 永遠只是歷史、不會復活。用陣列而非單一物件，是因為「解除後再記一次」必須保留原本解除過哪一筆的稽核線索。每個 allocation 的 link 只保存自己那一筆 `recordId`；多品項共用同一 `batchId`，但不得讓任一 allocation 保存整批的 recordIds。**不持久化任何 status 字串。**
- **`releasedAt`（改回未記帳）**：使用者主動解除某個 allocation 記帳關聯的**事實**，不是 UI 狀態——它無法從 Ledger 推導，因此必須落地。只更新該 allocation 最後一個尚未解除的 link，不刪 link、不清 `recordId`／`batchId`／`linkedAt`、不動原 Ledger 紀錄。已解除者不重複寫入；沒有 active link 時不提供入口。
- **記帳三態**：`linked`（已記帳）／`unverified`（記帳狀態待確認）／`unlinked`（未記帳），一律由目前 Ledger、durable queue、delivery bridge、replacement 與 tombstone 動態推導。團體紀錄安全寫入 durable queue 即算 `linked`，不必等 Google Sheet 回讀。**「找不到 record」不等於已刪除**——離線、資料未載入、bridge 未收斂、TEST／正式宇宙不符、目前成員可見性差異都只能降級為 `unverified`：阻擋再次記帳、不清除 link、不自動寫 `releasedAt`。只有「原紀錄仍在事件流中、但已被有效墓碑刪除且無有效 replacement」才是確定失效。推導一律讀 `mergedLedgerRecords()`，不得讀已套用「與我相關」過濾的 `ledgerTrackRecords()`。採買側的 link 是防重複入帳的輔助，**不是 Ledger 的安全或授權邊界**。
- **部分購買拆分**：只有待買、整筆 `unlinked`、所有 allocation 都是安全正整數且總需求大於 1 時，卡片才直接顯示「部分購買」；自己的數量 1、legacy 數量、已買、`linked`／`partial`／`unverified` 都不顯示入口。原需求按 allocation 拆成「已買部分」與「剩餘待買部分」，每位對象可輸入 0 到原需求的本次數量，剩餘由 `shoppingAllocationSplitPlan()` 計算。**原 item ID 成為已買部分**，剩餘部分取新 ID 並插在 store array 的正後方（用 `add()` append 會讓剩餘項目跳到群組尾端）。`splitGroupId = 既有 splitGroupId || 來源 id`，重複拆分沿用同一個；明細用同一 split group 依對象加總，重建原需求。兩筆都沿用原 `createdAt`，不新增 `splitFromId`／`splitAt`，不建立完整拆分樹。
- **安全反向回併**：已買 checkbox 取消、已買頁批次「移回待買」與完成 Toast「復原」一律呼叫 Shopping Store 的原子 `moveBackToPending(ids)`；Store 只讀目前 items 一次、建立一次完整轉換計畫、normalize 一次並 write 一次，任一 ID 不存在、normalize／數量驗證或 write 失敗時整批不寫入。受影響且非空的 `splitGroupId` 只有在**全部現存 sibling 都已待買、原 item `id === splitGroupId` 仍存在、品名／分類／單位／站點／legacy 狀態一致、allocation 都是安全正整數且逐對象與總數加總不溢位、所有 `ledgerLinks[]` 都是空陣列、canonical 對象唯一且自己不與代購混用**時才合併；released 等任何歷史 link 也會阻止回併。合併保留原 item ID／`createdAt`／欄位，canonical 同對象加總數量，優先沿用原 item 的 `allocationId`，否則沿用 store order 最前 sibling 的既有 ID；結果設為待買、清空 `completedAt`／`splitGroupId`，並在同一次 write 移除其他 sibling。任一條件不符時移回待買仍成功，但不改 allocation、link、split group 或 sibling，不做部分合併與欄位猜測；仍有已買 sibling 是正常的部分購買狀態，不顯示警告。
- **採買列資訊分層**：renderer 必須由明確 page context 決定地點層，不得先輸出再用 CSS 隱藏。待買頁卡片只輸出「品名／代購對象、記帳狀態、分類與數量」，站點由所在的 `DAY N · 站點名稱`、行程站點待確認、原行程站點已失效或隨時可買群組表達；一般與多選模式都不得在卡片 DOM／無障礙樹重複輸出地點。已買頁只有單一平鋪群組，因此卡片保留獨立地點列；待買與已買明細都保留完整行程站點，Today 提醒仍依站點分組。可見代購文案是 `幫 [阿寶] [媽媽] +1 買`：只有姓名使用與行程卡時間一致的 coral／淡紅底 badge，「幫」／「買」／`+N` 使用普通文字且不顯示 `、`；aria-label 保留完整語意。分類使用淡金底／深金字 badge，不再與品名或代購同色。`⋯` 只保留改回未記帳、編輯與刪除；「部分購買」與已買後「記帳」是卡片主流程。卡片 body 是獨立詳情按鈕，checkbox、列上動作與 `⋯` 都必須阻止事件冒泡。
- **採買新增／編輯 Sheet**：`＋` 與 `⋯ → 編輯` 共用一個獨立於清單內容流的 modal Sheet；清單保留原 scrollTop，Sheet 開啟時清單 inert，任何驗證或 store 失敗都不得關閉表單。session 保存 mode、item ID、來源 context、scrollTop、原分類／站點與 `savePending`；取消或成功後以穩定 `data-shopping-item-id` 返回同一卡片，分類／站點改變時捲到移動後位置，從明細進入則重開明細。`savePending` 阻擋重複送出與關閉。「儲存並新增」保留分類／站點，清空其他品項輸入並重設 `1 個`，且必須在同一使用者動作內同步 focus `shoppingName`，Toast 不得搶走焦點。
- **採買明細**：區段標題為「代購對象與記帳紀錄」。對象姓名與數量同行，待買顯示 `需求 3 包 · 待買 1 包`，已買顯示 `需求 3 包 · 已買 2 包`；窄螢幕可自然換行。底部有未記帳 allocation 時，「編輯」與「記帳未完成對象」兩顆等寬同行；只有編輯時使用全寬。
- **採買多選**：完成 checkbox 與批次 selection 是兩個獨立狀態。正常模式待買未勾、已買已勾；進入任一分頁的多選後，所有選取框都從未勾開始，只讀 `shoppingUiState.selected`，點 checkbox 或卡片 body 只切換選取，不改 `done`。多選時隱藏卡片的「部分購買」／「記帳」／`⋯`；0 項只顯示「請選擇項目」，選取後固定底列同一行顯示 `已選 N` 與三顆等寬、不斷行的批次按鈕，清單須保留 spacer 讓最後卡片可捲到工具列上方。取消多選或切換分頁會清空 selection。
- **採買數量（結構化）**：`quantity` 已下沉到每個 allocation，必須是安全正整數（最小 1，不允許 0／負數／小數／`NaN`／`Infinity`／超出 `MAX_SAFE_INTEGER`）；`unit` 仍由 item 共用並獨立保存（正規化空白、**最多 6 字**、可自訂）。相同數量顯示 `2 盒／人 · 共 6 盒`，不同數量顯示 `共 4 盒 · 3 位`；單一 allocation 則顯示 `2 盒`。表單的單位是**下拉選單**並與每人數量並排；選項來自 `shoppingUnitStore`（key `trip_shopping_units`），新增單位在設定頁。新項目數量預設 1；「儲存並新增」只保留分類與站點，數量重設 1，其他欄位清空。
- **`legacyQtyText`**：只承接無法安全轉換的舊式自由文字。舊 `qty` 僅在「正整數＋可選單一空白＋不含數字與空白的單位」時自動轉換（`5 罐`／`5罐`／`10`）；`兩盒`、`約 3～5 個`、`3-5 個`、`家庭號 2 包`、`一組` 一律原文保留於 `legacyQtyText` 且 `quantity` 為 `null`——**不猜中文數字、不從字串中間擷取數字、不取區間端點、不默認成 1**。`quantity` 有值時 `legacyQtyText` 一律清空，不維護兩份可能互相矛盾的數量。正規化輸出**不再帶 `qty` 鏡像**，避免第二個可獨立修改的數量來源。
- **數量顯示 helper**：單一 allocation／legacy 顯示仍走 `shoppingQuantityLabel()`；整個 item 的卡片、Today、Ledger note、拆分預覽與明細一律走 `shoppingItemQuantitySummary()`，不得各自拼接「每人／總數」。`quantity:null` 的 v1～v6 舊式單筆資料可顯示 `legacyQtyText`，但必須先在編輯表單轉為數字與單位才能部分購買。
- **採買預設單位 `個`**：新項目與「儲存並新增」固定從 `1 個` 開始，單位下拉不得提供空白或「不指定」。`shoppingUnitStore` 必須永遠包含 `個`，設定頁不得刪除並顯示固定 Toast `「個」是新增採買項目的預設單位，無法刪除。`。既有非空單位一律原樣保留；既有空單位只在編輯草稿中預選 `個`，不得因讀取或開啟表單就回寫，只有使用者儲存時才落地。此規則不升個人備份版本、不做整批 migration。
- **`completedAt`**：實際完成時間。首次標記已買時寫入、移回待買時清空、再次完成時重寫、部分購買的已買部分於拆分當下寫入。舊資料缺欄補空字串，`done` 為 true 但無 `completedAt` 屬 legacy 降級，不得自行編造時間。順序分工：store array order 決定清單位置、`completedAt` 表示購買時間、`splitGroupId` 表示同源需求。**`createdAt` 不是購買時間。**
- **單筆記帳入口**：完成商品後不強制詢問記帳（B 批裁定），但單筆記帳功能沒有取消——入口移到**已買項目列**。只有 `unlinked` 顯示「記帳」（直接呼叫既有 `openShoppingLedgerEntry()`），`linked` 顯示「改回未記帳」，`unverified` 兩者都不提供（必須阻擋再次記帳）。顯示條件一律走共用 resolver，不得以 `ledgerLinks.length` 判斷。
- **自動改回未記帳**：記帳狀態是每次重繪即時推導，不是存下來的。**把帳本那筆刪掉，採買項目會自動變回「未記帳」**，不需要按任何東西（個人帳 → 讀不到即為權威；團體帳 → 有效墓碑且無 replacement）。手動的「改回未記帳」只補自動化決定不了的兩格：`unverified`（找不到但不能證明已刪除）、以及「消費是真的、只是連錯採買項目」。因此選單只在 `linked` 提供它。**絕不可改成「找不到就自動當作已刪除」**——離線一次就會把所有已記帳項目洗成未記帳，再記一輪即全套重複入帳。
- **個人狀態備份 v7**：Shopping Item 於 v5 新增 `completedAt`／`splitGroupId`／item-level `ledgerLinks`，v6 改為結構化 item-level `quantity`／`unit`／`legacyQtyText`，v7 再把對象、數量與 links 收進 `allocations[]`。新匯出只使用 v7；v1～v6 皆可還原並經 normalizer 安全補成單一 allocation，未知未來版本必須明確拒絕（含型別檢查，字串 `'7'` 不通過）。`trip_shopping_list` key 不變，不做整批預先 migration，每次 read 經 normalizer 補欄、寫回時自然升格。
- **代購對象共用名單**：採買表單與 Ledger 代購表單共用 `trip_ledger_proxy_targets`，任一入口新增後另一入口立即可見並依既有規則去重。
