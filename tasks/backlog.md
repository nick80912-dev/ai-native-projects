# BACKLOG(待辦,依優先序)

> 更新於 2026-09-12。做完或經 Bar 裁定不再需要的項目移到 done.md,正在做的移到 current.md。

> **編號刻意不連續,不得重排**:`tasks/current.md`、`tasks/done.md` 與 `07_CHANGELOG.md` 都以編號互相引用,重排會打斷既有交叉引用。已歸檔項目的編號一律**留空不回收**(目前缺號:1、2、3b、4、5、6–11、13–19、21–24、26、27);新項目接在現有最大號之後。

## 中優先(已核准正式待辦)
3. **驗收後 UI/內容微調**(最小修改,不動 schema)。
12. **決策記錄**:個人預算功能不做;多旅程平台化延後至旅程結束,併入框架抽取階段。
## 低優先(未來,不急)
20. **SW SHELL 快取清單補齊評估**:重新盤點現行 App Shell 必要資產與離線回歸範圍，不沿用已作廢的 ZIP 打包流程。
25. **AI Native Framework 抽取**:App 穩定落地後執行,見 `FUTURE_PLAN_framework-extraction.md`。
28. **打卡控制觸控目標過小**:行程頁的 `.chk` 打卡方塊為 **24×24px**,整列不是熱區(往右 80px 落在 `.item-main`,不觸發)。`04_UI_GUIDELINES.md` 自訂的門檻是「所有清單觸控列 ≥44px 高」,24×24 約為建議面積的 30%,而這是走路中單手操作的元件。同頁 `.qa-btn` 為 38–41px,但準則對它有 ≥38px 的明文豁免,不在此項範圍。**Bar 於 2026-09-10 裁定暫不處理。** 屬 Tier 2,動工前需四項確認並 forward bump。
29. **多處字級低於準則下限**:`04_UI_GUIDELINES.md` 寫「輔助 11-13px」,實測行程頁 `.dow` 星期為 **9.5px**(6 處)、`.drive-chip`／`.tag` 10.5px(13 處)、今天頁 `.h-lbl` 10.5px(6 處)、購物頁 `.fl-arw` 10px(11 處)、分帳 `ledger-status-pill`／`ledger-summary-helper` 10px。改動散布廣,需逐一評估會不會撐破既有版面。**Bar 於 2026-09-10 裁定暫不處理。** 屬 Tier 2。

30. **`manualSync` / `manualSyncNew` 死碼移除(搭便車項目,不得單獨 bump)**:目前 generation 的 `index.html` 有兩行無人呼叫的函式 —— `manualSyncNew()`(`toast('正在抓取最新行程…'); return syncAll(true);`)與其別名 `manualSync()`。全檔只有這兩行定義,**零呼叫點**。
    - **不是能力缺口**:手動重拉行程資料的路徑存在且正常 —— 頁首同步 chip(`#syncBtn` → `openSyncStatus()`)的面板裡有 `.sync-status-retry` 按鈕接 `retrySyncFromPanel()` → `syncAll(true)`。這兩行是舊入口的遺骸。
    - **為何不單獨處理**:依 **ADR 0019**,已發布 generation 的 shell 資源不得就地改,即使是零行為影響的死碼。刪這兩行等於完整 forward bump(新世代目錄、`sw.js`、`netlify.toml`、`runtime-assets.json`、活文件 generation 引用、新驗收清單、再發一次正式站)。**2026-09-12 Bar 裁定:記進 backlog,搭下次因其他原因升版時一併刪除。** **#31 同批** —— 兩者都只等一次 bump,執行時一起做。
    - **執行方式**:下次 bump 建立新 generation 後,在新的 `index.html` 刪掉那兩行,確認全檔無 `manualSync` 字樣。
    - **測試要一併處理**:`tests/atomic-sheet-sync.test.js:292` 有一條**負向斷言** `assert(!/id="syncBtn" onclick="manualSyncNew\(\)"/…,'header no longer syncs directly')`。刪掉函式後它仍會通過,但**變成空轉** —— 守的是一個已不存在的東西。同檔第 291 行的 `assert(/id="syncBtn" onclick="openSyncStatus\(\)"/…)` 已經正面守住同一個意圖,因此第 292 行應一併移除,而不是留著假裝有保護。

31. **新增消費畫面三塊底色 token 化(搭便車項目,與 #30 同批)**:「這筆是代購」、「其他資訊(選填)」、團體軌的「分攤成員」三塊的底色**都不跟著主題走**,分離度是碰運氣。2026-09-12 在正式站 v115、390×844 下實測六組主題。

    - **現況**:
      - `.ledger-entry-summary`(其他資訊與分攤成員共用)用 `var(--entry-secondary-bg)` / `var(--entry-secondary-border)`。**看起來是 token,但不是主題層 token** —— 六組主題下恆為 `#f3f8f6` / `#cfe0dd`。
      - `.ledger-proxy-switch`(這筆是代購)**連 token 都沒有**:`background:#f4e9e6`、`border:1px solid #c99c94`、`color:#6e4540`,三個寫死的 hex。
      - 對照:`--paper`、`--card`、`--ink`、`--ink-soft`、`--line`、`--line-soft`、`--sea`、`--sea-deep`、`--coral` **都逐主題變動**;六組固定的只有 `--gold`(準則明訂的固定色)與上述兩個 `--entry-secondary-*`。

    - **實測(紙底 RGB 距離,沿用 v113 契約的 ≥10 門檻)**:

      | 主題 | 代購 vs 紙底 | 其他資訊／分攤成員 vs 紙底 |
      |---|---|---|
      | ocean | **8** ❌ | 16 |
      | cedar | 14 | 13 |
      | mist | 22 | **7** ❌ |
      | tea | **8** ❌ | 17 |
      | ivory | 23 | **7** ❌ |
      | wisteria | 20 | **6** ❌ |

      六組裡**只有 cedar 兩塊都過門檻,且 14／13 僅勉強過**。溫暖紙底(ocean／tea)吃掉粉色的代購;冷色紙底(mist／ivory／wisteria)吃掉薄荷色的其他資訊。

    - **不要改成另一個固定色** —— 任何固定值都只是換一批主題壞掉。問題在結構,不在色值。

    - **選項 A**:把 `--entry-secondary-bg` / `--entry-secondary-border` 納入六組主題的 token 集。最正統,但 13 個第一層 token 變 15 個,六組都要補值並過對比測試,成本高。

    - **選項 B(建議)**:改用既有 per-theme token 推導,不新增 token ——
      `.ledger-entry-summary{background:var(--card);border:1px solid var(--line)}`。`--card` 與 `--line` 本就逐主題變動,而 sheet 背景就是 `--paper`,兩者關係每組主題都已設計過,分離度自動成立、不必再驗六次。
      代購那塊的粉色有語意(標示代購模式),對應的是 `--coral` —— 而 `--coral` 本來就逐主題變動,應從它推導而非寫死。

    - **順帶的結構觀察(可一併評估,不必同批做完)**:整份 CSS **151 處用 token、102 處寫死 hex**;扣掉 58 個純 `#fff`,仍有 **44 個寫死的帶色面**(`#fff3cf`、`#fdeaea`、`#e7f2f2` 等)。代購只是其中一例。**v113 花力氣調的三組主題辨識度,在這些小面上是失效的。**

    - **為何不單獨處理**:同 #30 —— 依 ADR 0019,已發布 generation 不得就地改,一行 CSS 也要完整 forward bump。**與 #30 同批執行**。

32. **多品項新增消費:帳單摘要列與單品項對齊(搭便車項目,與 #30／#31 同批)**:多品項模式帳單資訊卡裡的 `.ledger-multi-summary`(收合時顯示 `2026/09/12 · 現金 · 餐飲`,343×44)與單品項的同一個邏輯控制項有**五處不一致**((a)–(e)),其中 (e) 是外觀與摺疊行為。2026-09-12 在正式站 v115、390×844 實測。

    - **兩個文字函式並排即可看出**:
      - `ledgerSingleSummaryText(draft)` → `[ledgerOptionalDateLabel(draft.occurredDate, appNow()), draft.category, draft.payMethod, 有備註/無備註].join(' · ')`
      - `ledgerMultiSummaryText(draft)` → `draft.occurredDate + ' · ' + draft.payMethod + ' · ' + draft.categoryApply`

    - **(a) 沒有標籤**:單品項的 `.ledger-entry-summary` 內含 `<small>其他資訊(選填)</small>` 再接值;多品項只有裸值。收合時看不出那是什麼、也看不出是選填。**建議補上同層級標籤**。

    - **(b) 日期格式不一致,而且函式現成**:單品項走 `ledgerOptionalDateLabel()` 顯示「今天」;多品項直接吐 `draft.occurredDate` 的 `2026/09/12`。**相對日期格式化函式就在同一個檔案、單品項已經在用,多品項只是沒呼叫**。六天行程中掃「今天／昨天」遠比掃絕對日期快。**四項裡改動最小、旅途價值最高,建議優先**。

    - **(c) `餐飲` 在收合行裡語意被夷平**:展開後它標示得很清楚 —— `renderLedgerCategoryApply()` 給的是 **`預設類別`** 加上說明「新品項自動帶入,可逐筆調整」與「套用至全部」按鈕。但收合行把它和日期、支付方式並列成三個等價的值,讀起來像「這張帳單的類別是餐飲」。實際上前兩者是帳單事實,第三個是**新品項的範本**;而每個品項列本身又各自顯示 `🍜 餐飲⌄`,容易被誤讀成重複或衝突。**建議收合行加註語意(`… · 預設 餐飲`),或只留真正的帳單事實(`今天 · 現金`),把預設類別交給展開區與品項列**。

    - **(d) 欄位順序不一致**:單品項 `日期 · 類別 · 支付`,多品項 `日期 · 支付 · 類別`。切換模式時欄位會跳位。**建議統一**。

    - **(e) 外觀與摺疊行為:同一張 sheet 裡有兩套摺疊控制項,這一顆用的是比較差的那套(Bar 2026-09-12 指出視覺不協調,實測確認)**

      | | `.ledger-multi-summary`(本項) | `.ledger-disclosure-toggle`(同 sheet 的「稅與優惠券」) |
      |---|---|---|
      | 背景 | `rgb(243,248,246)` 實色 ＋ 邊框 | `transparent`(**實為 #34 的 bug,原意是 `var(--mint)`**) |
      | 圓角 | **10px** | 8px |
      | chevron | `<span aria-hidden>⌄</span>`,**無 class** | `<span class="chevron">` |
      | transition | `all`(未指定) | `transform 0.2s` |
      | 展開時 | **`transform: none`,不旋轉** | `rotate(180deg)` |

      - **(e-1) 箭頭不旋轉,違反既有準則**:`04_UI_GUIDELINES` 明訂「摺疊箭頭旋轉動畫 .25s」,而 CSS 也已存在 —— `.ledger-disclosure-toggle .chevron{transition:transform .2s}` 與 `.ledger-disclosure-toggle[aria-expanded="true"] .chevron{transform:rotate(180deg)}`。但本顆的 chevron **沒有 `.chevron` class**,兩條選擇器都不命中,展開後箭頭仍朝下,狀態只能靠內容有沒有跑出來判斷。**加一個 class 即生效,CSS 不必新增 —— 四項中最划算**。

      - **(e-2) `.ledger-entry-summary.open` 是死 CSS**:規則 `{border-radius:10px 10px 0 0}` 存在,意圖是展開時上圓下方、與下方面板接成一體,**但沒有任何地方加上 `open` class**。實測展開後圓角仍是四角 10px,而下方 `.ledger-multi-bill-secondary` 是 `background:transparent; border:0; border-radius:0` 的裸內容 —— **兩者視覺上完全沒有連接**,看起來像一顆按鈕後面多出一坨東西,而不是一個展開的區塊。

      - **(e-3) 內圓角大於父容器**:外層 `.ledger-multi-bill-info` 為白底、**8px** 圓角;本顆為色底＋邊框＋**10px** 圓角。巢狀容器的內圓角應等於或小於外圓角,10px 包在 8px 裡會視覺上頂出來;再加上白卡內再套一個有邊框的色塊,等於兩層容器互相競爭。

      - **建議(依成本排序)**:①給 chevron 加 `.chevron` class;②圓角 10px → 8px 對齊父卡片;③二選一收斂 —— 讓 `.open` 真的套用(展開時與面板接合),或改用 `.ledger-disclosure-toggle`,讓它像「卡片內的區塊標題」而非「卡片內的一顆按鈕」。**傾向後者**,但理由限於**摺疊行為**(箭頭旋轉、圓角、狀態表達),不包含外觀。
        **更正(2026-09-12)**:本項原先寫「傾向後者,因為它透明底、無邊框、不跟卡片競爭」。**該透明底是 #34 的 bug,不是設計意圖** —— `.ledger-disclosure-toggle` 的規則寫的是 `background:var(--mint)`,而 `--mint` 從未定義。#34 修好之後它會有底色,原本的理由不成立,已刪除。底色那層仍由 #31 與 #34 處理。

    - **不是不一致、不要「修」**:多品項少了「有備註／無備註」是正確的 —— `renderLedgerMultiBillInfo()` 只組 occurrence／payment／categoryApply 三段,**多品項的帳單資訊裡根本沒有備註欄**,沒有東西可顯示。

    - **底色不在本項**:`.ledger-multi-summary` 吃的是 `.ledger-entry-summary` 同一條規則,已由 **#31** 涵蓋。

    - **一併記錄但不建議處理**:初始捲動位置下,`稅與優惠券(選填)` 那一列(高 44px)被 sticky 的 `.ledger-sheet-actions`(z-index 2,不透明)蓋住 **24px**,`elementFromPoint` 在該列中心回傳的是操作列。**但捲到底後重疊為 0、點擊正確落回該列**,而該 sheet 總捲動量僅 111px。**屬發現率問題,不是 v98 那類阻斷式遮罩**。#33 執行後操作列由 172px 降至約 116px,此項自動消失。

    - **為何不單獨處理**:同 #30／#31 —— 依 ADR 0019 需完整 forward bump。**三項同批執行**。

33. **overlay 離開方式統一:點背景關閉,並移除記帳 sheet 的「取消」按鈕(Bar 2026-09-12 裁定)**:刪除記帳 sheet 底部的「取消」,離開改由右上角 `×` 與**點背景**承擔;原提案理由是底部三顆全寬按鈕過高、視覺過重。同時把「點背景關閉」補到採買清單的照片檢視器。2026-09-12 於正式站 v115、390×844 實測評估。

    - **功能面零損失(已驗證)**:「取消」與右上 `×` 呼叫的是**完全相同的函式** `closeLedgerEntrySheet()`。兩者沒有語意差異 —— 取消不是「丟棄草稿」、`×` 不是「保留關閉」。刪掉不會少任何能力。

    - **量到的收益**:`.ledger-sheet-actions` 目前 **172px**(三顆 44px 全寬按鈕:確認儲存／儲存並再記一筆／取消)。移除後約降至 **116px**,釋出約 56px。**這足以讓 #32 記錄的 `稅與優惠券(選填)` 24px 遮擋完全消失**。右上 `×` 本身是 44×44,觸控目標合規。

    - **成本(必須一併處理,否則不建議執行)**:
      - `×` 位於 top 26,在 390×844 上是**單手可及性最差的角落**;「取消」在底部反而是拇指最好按的位置。刪掉等於把離開動作移到最難按的區域。
      - **點背景不會關閉** —— 實測 `.ledger-sheet-overlay` **沒有 onclick**,所以沒有大面積的後備離開路徑。
      - **沒有未存內容確認** —— 實測在「店家名稱」輸入文字後關閉,sheet 直接移除,不出現任何確認。現況兩個出口都如此,但一旦收斂成單一出口,這個缺口的權重會上升。

    - **做法(Bar 2026-09-12 裁定)**:「點背景關閉」為**配套預設**,不是選項。移除「取消」必須與 `.ledger-sheet-overlay` 的背景關閉同批落地 —— 失去一顆底部按鈕、換到一個比按鈕大得多的離開區域,可及性不降反升,也是 bottom sheet 的常規行為。**單獨移除而不配套,不得執行**。

    - **範圍同時納入採買清單的照片檢視器(Bar 同日追加)**:`#shoppingPhotoViewer` / `.shopping-photo-viewer` 目前**只有下滑關閉與關閉鈕,沒有點背景關閉、也沒有 Escape**。點照片以外的背景應可關閉。
      **實作注意**:必須以 `event.target===overlay` 判定,否則點照片本身也會關掉檢視器。

    - **這個模式 repo 裡已經有了,不是新發明**:
      - `installShoppingPhotoRepairDismiss(overlay)` 是一個**完整的離開行為套件** —— 背景點擊(`event.target===overlay`)、`Escape`、下滑(`dy>=72` 且 `dy>|dx|*1.25`)、`touchcancel` 清理,四者齊備。目前只有 `.shopping-photo-repair-overlay` 用它。
      - `#syncStatusOverlay` 用 inline 屬性做了同一件事:`onclick="if(event.target===this)closeSyncStatus()"`。
      - **照片檢視器是該套件的局部複製** —— 抄了 swipe(連 `72` 與 `1.25` 常數都一樣),**沒抄 click 與 keydown**。
      - 全 app **13 個 overlay 類別中只有 2 個**支援點背景關閉。

    - **建議連帶處理(可同批)**:把 `installShoppingPhotoRepairDismiss()` 抽成參數化的共用函式(如 `installOverlayDismiss(overlay, close)`),讓三處共用同一組行為與常數,而不是繼續各自複製。否則這次補完兩個,下一個 overlay 又會少一半。

    - **待裁定事項**:僅剩「是否一併補未存內容確認」—— 目前輸入店家名稱後關閉會直接丟棄、不確認。此項可獨立於本案,不阻擋上述執行。

    - **為何不單獨處理**:同 #30／#31／#32 —— 依 ADR 0019 需完整 forward bump。若成案,**與該三項同批執行**。

34. **⭐ `--mint` 從未定義,8 條規則的背景靜默消失(缺陷,非提案)**:CSS 有 8 條規則使用 `var(--mint)`,但**該 token 在 repo 歷史中從未被定義過**(`git log -S"--mint:"` 無任何結果)。無 fallback 的 `var()` 解析失敗時,該屬性在計算值階段失效,`background` 退回初始值 `transparent` —— **填色就這樣無聲消失**。2026-09-12 由 Bar 指出採買分類「已選看不出來」而追查到根因。

    - **實測佐證**:`getPropertyValue('--mint')` 回空字串;以 `background:var(--mint)` 探針測得 `rgba(0, 0, 0, 0)`;對照組 `background:var(--sea)` 正常解析為 `rgb(18, 112, 127)`。

    - **受影響的 8 條規則**(★ 為選取狀態,也就是「選了卻看不出來」):
      - ★ `.shopping-chip.on` —— 採買分類。規則為 `border-color:var(--sea); background:var(--mint); color:var(--sea-deep)`,**意圖完全正確,只是填色沒生效**。剩下的線索只有 **0.667px** 的邊框顏色與文字深淺(`rgb(92,107,115)` → `rgb(14,58,68)`),字重同為 800 未變 —— 四顆 12px chip 並排時辨識不出來。
      - ★ `.ledger-history-filter-btn.on`
      - ★ `.ledger-history-compact-options .ledger-sheet-choice.on`
      - `.ledger-item-flag.on`
      - `.ledger-disclosure-toggle`(其透明外觀是本 bug 的產物,見 #32 (e) 的更正)
      - `.ledger-bill-preview`／`.ledger-correction-preview`
      - `.shopping-link-linked`

    - **原本想要的顏色幾乎可以確定是 `#d6e8e4`** —— `.ledger-participant-choice.on` 把它**寫死**了(`border-color:var(--sea-deep); background:#d6e8e4; color:var(--sea-deep)`)。所以整件事是:有人打算用 token、在 8 處引用、在 1 處寫死了值、**但從沒定義那個 token**。

    - **對照:app 其他選取狀態都有填色**,本組是唯一的例外 —— `.member-option.on`／`.ledger-track-btn.on`／`.ledger-choice.on`／`.ledger-sheet-choice.on` 皆為 `background:var(--sea)` 加白字。

    - **修法**:定義 `--mint`,但**建議逐主題定義**(比照 `--sea`／`--card`／`--line`),不要給單一全域值 —— 否則會直接變成 **#31** 記錄的同一類問題:固定色配上逐主題紙底,分離度碰運氣。

    - **本批 CP 值最高**:修改量是定義一個 token,影響 8 個面、其中 3 個是選取狀態。**建議在下次 bump 時優先處理**。與 #31 相鄰(同為顏色 token 的主題適配),但性質不同 —— #31 是「寫死的值不跟主題走」,本項是「token 根本不存在」。

## 想法池(未承諾)
- 社群內容抓取(Facebook 等)——需 Firecrawl/Playwright MCP,尚未配置
