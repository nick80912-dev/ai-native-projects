# DONE(已完成)

> 更新於 2026-11-12。完成事項來自 `.ai-manifest.json` status.done、既有 CHANGELOG 與 Bar 驗收確認；細節仍以 07_CHANGELOG.md 為準。

## 2026-11-09 自 backlog 移入(Bar:待辦清單只留還沒做的)

> 下面是原文搬移,內容不改。#55 繪本主題研究由 Bar 2026-11-09 關閉(「繪本主題研究也關閉」);#28、#29、#41 同日由 Bar 裁定不是問題;#63 只搬個人帳部分,團體帳仍在 backlog。

12. **決策記錄**:個人預算功能不做;多旅程平台化延後至旅程結束,併入框架抽取階段。

28. ~~**打卡控制觸控目標過小**~~ **(2026-11-09 Bar 裁定不列入:「這些我認為都不是問題,不列入優化討論」,本項關閉,之後稽核不再列出)**:行程頁的 `.chk` 打卡方塊為 **24×24px**,整列不是熱區(往右 80px 落在 `.item-main`,不觸發)。`04_UI_GUIDELINES.md` 自訂的門檻是「所有清單觸控列 ≥44px 高」,24×24 約為建議面積的 30%,而這是走路中單手操作的元件。同頁 `.qa-btn` 為 38–41px,但準則對它有 ≥38px 的明文豁免,不在此項範圍。**Bar 於 2026-09-10 裁定暫不處理。** 屬 Tier 2,動工前需四項確認並 forward bump。

29. ~~**多處字級低於準則下限**~~ **(2026-11-09 Bar 裁定不列入:「這些我認為都不是問題,不列入優化討論」,本項關閉,之後稽核不再列出)**:`04_UI_GUIDELINES.md` 寫「輔助 11-13px」,實測行程頁 `.dow` 星期為 **9.5px**(6 處)、`.drive-chip`／`.tag` 10.5px(13 處)、今天頁 `.h-lbl` 10.5px(6 處)、購物頁 `.fl-arw` 10px(11 處)、分帳 `ledger-status-pill`／`ledger-summary-helper` 10px。改動散布廣,需逐一評估會不會撐破既有版面。**Bar 於 2026-09-10 裁定暫不處理。** 屬 Tier 2。
    - **2026-09-23 複審補量(v126)**:全 stylesheet 共 **45 處** `font-size < 11px`,最小 **8.5px**,分佈 8.5／9／9.5／10／10.5px。原記錄只涵蓋其中一部分。清除死 CSS 後這個數字已是活規則的實數。**本項範圍因此比原記述大**,動工前重新盤點。
    - **2026-10-03 A 批部分處理（v142 本機候選，未推送）**：依 Bar 的保守尺寸要求，星期、今天摘要標籤與最近帳務代買前後字／對象共四個 selector 改為 11px；其餘候選保留。見 `docs/ui-font-audit-2026-10-03.md`，不表示本項全面完成或真機驗收通過。

41. ~~**Ledger 表單一批觸控目標低於 44px**~~ **(2026-11-09 Bar 裁定不列入:「這些我認為都不是問題,不列入優化討論」,本項關閉,之後稽核不再列出)**:`.ledger-participant-choice` **28px**、`.ledger-proxy-add-row button` 30px、`.ledger-category-apply-actions button` 34px、`.ledger-history-compact-options .ledger-sheet-choice` 34px、`.ledger-option-row button`／`.ledger-action-popover button`／`.ledger-form-open-choice`／`.ledger-entry-heading-row .ledger-sheet-toggle` 36px、`.travel-note-kind button` 36px、`.settings-identity-actions .btn` 38px。

    - **與 #28 的分界**:#28 是行程頁的 `.chk` 24×24px(Bar 2026-09-10 裁定暫不處理);本項是**記帳表單**這一整批,不同畫面、不同使用情境 —— 記帳多在店內站著單手操作,錯按成本是寫錯一筆帳。
    - **`.ledger-participant-choice` 28px 最該優先**:它是分攤成員的多選 chip,一次要點好幾個,而且 v123 才剛把它的選取底色主題化(表示它是活的、會被用到的元件)。
    - 改動會撐開既有版面(`.ledger-item-control-row` 的 grid 欄寬、popover 高度),需逐一評估。屬 Tier 2,需 forward bump。
    - **⚠ 2026-09-23 實機走查修正**:上列數字全部是 **CSS 宣告值**,不等於使用者實際碰得到的尺寸。在 active-trip 下實際打開「新增消費」表單量測,**該畫面最小的控制項是 40px**(`個人／團體`、`JPY／TWD` 四顆 segmented 選項)與 **36px** 的「多品項」toggle —— **28–36px 那批多數在摺疊區內**,預設收合。
      - `.ledger-participant-choice`(28px)位於「分攤成員」展開區,預設顯示為「全員 4 人 ⌄」一行收合。**該展開狀態尚未實測**(嘗試展開時誤觸關閉),動工前要先看過真實展開的樣子再決定要不要改。
      - 因此本項的**實際影響面比原記述小**,優先序可往後調;但「分攤成員一次要點好幾個」的論點若在展開後成立,仍值得處理。
    - **不要動的部分 —— 新增消費表單的金額欄是好範例**:實測 `金額 (¥)` 輸入框 **67px 高、30px 字級**,`明細` 46px／16px,表單總高 694px(視窗 812)不需捲動即可看到儲存鈕,次要資訊收在「其他資訊(選填)· 今天 · 餐飲 · 現金 · 無備註 ⌄」一行摺疊。**這正是站在店裡單手輸入該有的樣子**,調整周邊控制項時不得為了「一致」把它縮小。
    - 來源:2026-09-23 新模型全專案複審(CSS 量測)+ 同日 active-trip 實機走查(渲染量測)。

54. ✅ **回程後驗證 Ubuntu 26.04,解除 CI 的 ubuntu-24.04 釘版(#42 後續)**(2026-10-30 完成:PR [#88](https://github.com/nick80912-dev/ai-native-projects/pull/88) 先在 `ubuntu-26.04` 跑兩個 job 全綠——映像 `ubuntu26/20261025.179`、`playwright install --with-deps` 正常、browser-qa 374 passed——再改回 `ubuntu-latest`):2026-10-06 為避開旅程期間的分批移轉,`qa.yml` 兩個 job 暫時釘 `ubuntu-24.04`。回程後(10/24 起)處理:

    - **先驗再解**:另開分支把兩個 job 改成 `ubuntu-26.04`,看 `browser-qa` 的 `npx playwright install --with-deps chromium`(`@playwright/test` 1.62.0)能否裝好系統套件、完整 Chromium 套件是否全綠。
    - **全綠**:改回 `ubuntu-latest`(屆時已指向 26.04),刪掉 `qa.yml` 裡的釘版註解。
    - **不綠**:維持 24.04,先升 Playwright 再試;24.04 標籤在移轉完成後仍會保留一段時間,不急。
    - **時限**:GitHub 預計 11/19 完成移轉,之後 24.04 會逐步淘汰,勿無限期擱置。

55. ~~**繪本主題(第七組主題)——旅程後研究(Bar 2026-10-11)**~~ **(2026-11-09 Bar 關閉:「繪本主題研究也關閉」)**:參考他人提供的日系繪本風 prompt(和紙白底、墨灰線條、珊瑚粉／山吹黃／水色／若竹綠)。v149 已先上線其中兩項:全站 Huninn 字型(不擋第一個畫面)與交通彩色標籤。
    - **線框與圓角**:卡片 3px 墨灰框、圓角 20px、標籤 2px 膠囊。2026-10-11 已做預覽,**Bar 評估後決定不做**;若日後重提,只能放在繪本主題內,不改其他六組主題。
    - **做法**:新增主題須補齊 13 個 `--t-*` token 並通過 `theme-system.test.js` 的對比測試;按鈕形狀依 04「形狀語意」不得改成膠囊。屬 Tier 2(外殼),動工前送四項確認。
    - **其他可借用的想法**:出發倒數放大(Bar 認為首頁會過長,暫不採用)、「必去」標記與航班卡(需 Sheet 新欄位,可併入連接新旅程的範本)。

57. **出發前稽核的回程後項目(Bar 2026-10-15 裁定)**:2026-10-15 出發前稽核(UI/UX、Bug、多餘程式、用不到的內容、逐項操作)共列 53 項。Bar 選的 B1、L3、L8(只改文案)、T3、T12 已在 v156 出發前完成;Bar 2026-10-16 再要求的 T2、T8、團體帳代記(L7／L8 後續)與清理已在 v157 完成(見 `07_CHANGELOG.md`)。其餘回程後依下列順序處理。編號沿用稽核報告。
    - **清除旅程(10/24 起)之前要先做**:
      - ✅ T5／T6(v160 完成):清除預檢失敗時顯示「無法清除：無法清除：pending-queue」這類重複前綴與英文代碼;清除說明仍寫「此版本無法連接新旅程」。改成白話原因與下一步。
      - ✅ B2(v161 完成):分帳設定橋接只在發布值與本機值完全相同時才清除;儲存失敗或別台手機改過設定時,這台手機會一直用自己的匯率,打包預檢也會一直被擋。
      - ✅ T14(v160 完成):旅程結束後首頁提醒先到分帳結清,並加「前往分帳」;設定入口改名「資料與版本」。
    - **高**(✅ v161 完成):L1(「從 JSON 還原」與「手動複製備份」對話框被設定頁蓋住)、L2(還原直接覆蓋目前的個人帳與待同步團體帳,沒有二次確認)。
    - **中**(✅ v163 完成 T1、T7、L4、L5、L6、L7;時間改依旅程時區:v164 曾固定日本時間,Bar 2026-10-30 裁定改回一律跟手機時區(v165,之後不一定去日本);✅ v166 B1 剩下的情況):
      - ✅ B3(v160 完成):結清被退回後只剩「我已付款」,重送的是舊金額。旅途中的替代做法是最後一天再結清。
      - T1:沒有時間的串點子站會被「下一站」跳過。**Bar 2026-10-16 裁定 10/22 倉敷的四個子站不補時間(那段時間不受限)**,改在程式修:沒有時間的站照行程順序接在前一站後面。
      - T7(還沒有身分的人從採買清單記帳會被選擇器困住)。T4 已於 v158 完成。
      - L4(類別可以全部刪光)、L5(刪掉的類別／支付方式讓舊紀錄存不了)、L6(簡易結算模式藏起待確認結清但徽章仍計數)、L7(個人帳列表含其他身分的紀錄)。
      - ✅ B1 剩下的情況(v166 完成,讀回的列存在手機上):App 在沒有網路時重開、CSV 還沒追上,剛記的團體帳在恢復連線前看不到。完整解法是把 fast pull 讀回的列存進本機,牽涉旅程資料鍵、備份與清除流程。
    - **低**:B4–B7、T11、T13、T15、T18–T21、L9–L28,細節見稽核報告(T9、T10、T16、T17 已於 v158 完成)。
    - **2026-11-09 重新稽核**:原報告沒有存進專案,上面的編號已查不到內容;Bar 選「重新稽核再挑」。用 v181 列出五項,✅ v182 做了「匯率寫法統一」與「清掉五個沒用到的函式」;小字（#29）與小按鈕（#28、#41）Bar 同日裁定不是問題、不列入優化,三項關閉。之後的稽核結果要寫進 repo（`docs/`）,不要只留在對話裡。
    - **清理**:v157 已刪除舊外殼世代 v111–v153、沒被引用的計畫與規格、舊交接與作廢文件、逐版驗證文件、icon-120、`trip_expenses` 提示、`v2_cache_*` 遷移與東京天氣城市。其餘沒用的程式(約 3 KB)與試算表 Expenses 分頁仍待 Bar 決定。
    - ✅ #54(CI 解除 ubuntu-24.04 釘版)已於 2026-10-30 完成。

59. ✅ **分帳收據照片(Bar 2026-10-19 提出並裁定方向;v167 完成)**:記帳時可以夾收據照片,之後點開那筆帳就能對照。
    - **v167 實作**(與下方草案不同處):照片放在獨立的 IndexedDB `trip-receipt-media`(不升 `trip-local-media` 的版本,舊分頁不會被擋;採買照片的孤兒清理也碰不到);更正收據與從採買記帳時不顯示照片欄(採買沿用自己的照片);照片健康狀態尚未併入。列表有照片的帳顯示「📎 收據」。Bar 2026-10-30 另加:加照片時用照片的拍攝時間帶入日期時間。規則見 `03_DATABASE.md`。
    - **Bar 的裁定**:照片**只存在拍照的那支手機**(沿用採買照片的做法,不上傳、不經 Google);**團體帳與個人帳都可以夾**;**一筆最多 3 張**。
    - **代價(Bar 已知悉)**:團體帳的照片只有記帳的人看得到,其他成員看不到;換手機、清除旅程或 iOS 清掉網站資料後照片就沒了;匯出備份不含照片。之後若要全團共享,再評估經 Apps Script 存進 Bar 的 Google Drive、另開「收據」工作表對應紀錄(不動分帳紀錄 21 欄)。
    - **做法草案**:
      - 存放:沿用 IndexedDB `trip-local-media`(升 `DB_VERSION`,新增 `ledger-receipts` store),壓縮規則同採買照片(長邊 1600px、JPEG 0.82,約 200 KB)。紀錄 ID → 照片 ID 清單存在本機的旅程資料鍵,**不寫進分帳紀錄、不改試算表與 Apps Script**。
      - 畫面:記帳表單(新增／修改／更正)多一列「收據照片」(拍照或從相簿選,縮圖可刪),列表有照片的帳顯示 📎,點開明細可看大圖。
      - 更正:更正產生的新紀錄(`replacesRecordId`)沿用原照片;作廢或刪除時一併移除(確認後)。
      - 容量:併入設定的「照片健康狀態」(用量、孤兒照片清理、空間不足提示);清除旅程時一起刪除。
      - 備份:比照採買照片,匯出與還原一律不含照片引用(`03_DATABASE.md` 補一節)。
      - 測試:對應表與孤兒清理的單元測試;瀏覽器測試涵蓋新增、檢視、刪除、更正沿用、離線可用、三張上限。
    - **時機**:旅途中凍結,不做。回程後排在 #57「清除旅程之前」三項之後,forward bump 到下一個未使用版本。

60. **✅ 收款人可以直接結清(Bar 2026-10-30 提出並裁定方向;v160 完成)**:現在只有欠錢的人能按「我已付款」,收款人再按「確認已收」;對方沒按,收款人就沒辦法把這筆結掉。改成收款人也能在自己那一列直接結清。
    - **Bar 的裁定**:
      - 單位是**轉帳建議那一列**(兩人之間所有帳抵銷後的淨額,例如「Amy → Bar ¥3,000」),不是單一筆帳。
      - 分兩種:「**已收到**」(對方用現金或其他方式付過了)與「**不用付了**」(免收)。兩種都把這列結清,歷史紀錄標出是哪一種。
      - 選「不用付了」時**花費統計不變**:「我的總花費」照原本的分攤算,免收只影響誰欠誰。
    - **為什麼安全**:只有收款人能按,而這只會減少他自己應收的錢,不會讓別人多付,所以不需要欠款者再確認。
    - **做法草案**(沿用 ADR 0007 的結算握手,不改試算表欄位與 Apps Script):
      - 收款人按下後一次寫兩筆:一筆 `settlement_claim`(`member` 是欠款者,備註尾端寫「〔Bar 代記〕」,沿用 v157 代記的格式),緊接一筆收款人的 `settlement_confirm`。「不用付了」在備註多寫「免收」。
      - 轉帳建議列:欠款者仍是「我已付款」;收款人那一列新增「已收到」「不用付了」兩顆(或一顆「結清」再選),按下前確認金額與對象。
      - 已有進行中的「我已付款」時不顯示,改走原本的「確認已收」。
      - 歷史紀錄的 chip:「已收到」「免收」,與欠款者發起後確認的「已結清」區分。
      - 10 秒復原沿用現有的「已確認收款」復原機制。
      - 要先確認 ADR 0007 對代記 claim 的規則(撤回權限、重複 claim 抑制),並補 ADR 增補段。
    - **測試**:兩種結清各自讓雙方淨額歸零;欠款者那邊看到已結清、沒有「我已付款」;免收不改「我的總花費」;已有 claim 時不出現新按鈕;離線送出排隊;復原。
    - **相關**:#57 的 B3(結清被退回後重送舊金額)同一區,一起處理。

61. ✅ **v171 已做**(Bar 2026-10-31 申請 Gemini 免費版金鑰並放進岡山 Apps Script;上線後 Bar 要更新部署岡山的 Apps Script,見 `07_CHANGELOG.md` v171)。**收據照片自動辨識(Bar 2026-10-30 裁定用雲端 AI;2026-10-31 併入讀收據上的日期時間;排在 #62 之後)**:Bar 問能否從照片直接讀出日期時間與金額。v167 先用 EXIF 拍攝時間;Bar 2026-10-31 要求改讀**收據上印的日期時間**,併入本項。雲端 AI 一次讀出日期、時間、金額、幣別、店名;讀不到收據時間才用拍照時間。不限國家與語言(#62)。
    - **做法草案**:加照片時(有網路才做),經現有 Google Apps Script 呼叫 Google 的 AI 服務辨識收據,把讀到的金額(與店名、日期)先填進表單,存檔前一律可看、可改,不自動送出。沒有網路或辨識失敗就照常手動輸入。
    - **動工前要 Bar 做的事**:申請一組 API 金鑰並放進 Apps Script(由 AI 寫步驟);確認接受辨識時照片會傳到雲端一次(辨識完照片仍只存在拍照的手機)。免費額度與條款動工前再查一次。

62. **不限日本:幣別、稅、天氣(Bar 2026-10-31 提出並裁定)**:之後不一定去日本。設計見 `docs/superpowers/specs/2026-10-31-multi-country-trips.md`。
    - **Bar 的裁定**:結算一律台幣;一趟一種當地幣別;稅每趟自己設定(日本維持現狀);美金、歐元這類有小數的幣別記到分;先做本項再做 #61。試算表沒填匯率也可以,在手機「設定 → 分帳設定」補填當作全團基準(寫回 TripConfig,Bar 2026-10-31)。
    - **分批**:✅ v168 幣別基礎(TripConfig `Currency`、最小單位、顯示、Apps Script 驗證、匯率可在手機補填);✅ v169 稅(TripConfig `Tax Rates`／`Price Mode`／`Tax Free`,沒有稅率的旅程不顯示稅);✅ v170 天氣時區、預設支付方式、文案、ADR 0021 增補與新旅程手冊。新旅程要用新版 Apps Script(Bar 貼上部署),岡山不必重新部署。

63. **退稅追蹤(Bar 2026-10-31 提出並裁定)**:日本 2026/11/1 起免稅店改「先付稅、出境經海關確認後再退」(リファンド方式),退款由店家或委託的退稅業者處理,方式各家不同。Bar:「把稅額也識別並列出來，之後紀錄退稅金額多少也比較方便」。
    - **Bar 的裁定**:分兩版;實際退回的錢**抵掉原本的花費**(「我的總花費」扣掉);**先只做個人帳**,團體帳之後再說。
    - **分批**:✅ v177 收據辨識讀出稅額,可退稅的寫進備註;✅ v178(2026-11-01 上線,`production-v178`)、✅ v179(2026-11-03 上線,`production-v179`:Bar 要求簡化,退稅清單改成待退／已退／不退三個分頁,點一張決定已退〔可改實退〕或不退)、✅ v180(2026-11-03 上線,`production-v180`:記帳時「可退稅」移到金額下方,勾了跳出稅額視窗)、✅ v181(2026-11-09 上線,`production-v181`:「可退稅」移到計算機旁,稅額放在明細同一列) 個人帳每筆記「預計退稅」(收據稅額帶入、可改)、退稅清單(待退／已退)、離境前提醒(帶護照與商品過海關)、收到後記「實際退了多少」(可能被扣手續費或匯率不同)並抵掉花費;記帳表單的「免稅品」在新制下改成「可退稅」的意思。v178 要加帳本欄位(試算表、Apps Script、同步),動工前先給 Bar 看畫面。
    - **v178 畫面裁定(Bar 2026-10-31～11-01)**:「稅與優惠券」改成「稅」,**拿掉優惠券、換成稅額**(收據帶入,沒有收據照稅率算,可改;未稅時實付＝品項加總＋稅額);收據上有優惠券等折扣時**寫進備註**,多品項按金額比例分到各品項;退稅清單、記錄實際退稅、離境當天提醒、「我的總花費」扣掉實際退稅。Bar 看過草稿後再調整(說明改成「!」、「全部可退稅」按鈕拿掉改為辨識自動勾、「已收到」移到右邊、離境提醒放進 TODAY 卡片不另加卡片、不另建退稅表單),2026-11-01 回「好」。v178 實作:個人帳每筆多 taxAmount／refundAmount／refundMethod／refundDate(只在手機),個人備份格式升 v11;試算表與 Apps Script 不變。

## 已完成
- 2026-10-13:backlog **#56 隨 v153 提前完成**(2026-10-16 自 backlog 移入)。Bar 改為「整個重構現在做」並核准示意圖,另要求測試工具內容再濃縮;診斷面板旅程後優化 D(測試工具收合)、E(旅途紀錄入口)、F(面板入口與無障礙)全數納入 v153,A／B／C 已於 v152 完成。詳見 `07_CHANGELOG.md`。
- 2026-10-06:backlog **#51 隨 v147 完成**。`syncAll()` 失敗路徑補上與成功路徑相同的 inactive 重查:下載開始於 active、旅程清除後才失敗時,不再重建 `trip_sync_last_failure`、不設 `failed`、不跳 toast;active 時的失敗處理不變。`atomic-sheet-sync.test.js` 以可控 gate 做確定性回歸,先在 v146 紅、修正後綠、拿掉 guard 又紅。
- 2026-10-06:backlog **#42 處理**:`qa.yml` 的 `sanity`／`browser-qa` 暫時由 `ubuntu-latest` 釘到 `ubuntu-24.04`。查 GitHub 公告(`actions/runner-images#14748`)後發現移轉是 **10/19 起分批、11/19 完成**,整段旅程(10/18–10/23)CI 可能時而 24.04、時而 26.04 —— 最難除錯的時好時壞。今天 `ubuntu-latest` 本來就是 24.04,釘版不改變任何 CI 結果。原記「釘住會錯過安全性更新」不精確:24.04 映像仍由 GitHub 例行更新,釘的只是 OS 大版本。回程後解除另開 **#54**。
- 2026-10-06:**真機驗收全部完成**(Bar 整批回報)。TP141～TP146、v137／v138／v140／v142、**BB4 Android 八項**(自 v114 起掛著)與 v115～v121 iPhone 補驗,`docs/device-acceptance-log.md` 16 個清單項與 88 個表格格子記為 `✅ 2026-10-06 整批回報`;整批回報未逐項記錄細節,檔頭已註明。
- 2026-09-24:**分帳邏輯稽核(v135)**。Bar 要求確認個人／團體分帳邏輯並優化分帳頁。
  - **核心正確**:在真實 App 內以隨機不變量測試驗證 —— 均分守恆 20,000 例、團體淨額零和 400 趟、轉帳建議結清 800 次、多品項雙幣守恆 2,996 例,皆 0 失敗。
  - **修正**:(1) 税抜 多品項帳每編輯／更正一次就再加一次稅(現存 bug);(2) 「預設輸入幣別」其實是全團結算幣別,有還款紀錄即鎖定;(3) 單品稅區補「僅記錄」說明;(4) 分帳頁記住分頁、有未結清先開團體。
  - **查證後保留**:單品稅只記錄(Ledger 2.2 刻意)、個人帳代購不依身分過濾(7/18 刻意),皆有既有測試明文守著。**稽核報告階段就該先查「規格與實作不一致」處有無測試守著實作** —— 這次兩項都是動工時被測試擋下才發現。
  - **不修**:除不盡餘數給名單第一位(改了會重算歷史餘額);與我相關累計顯示帳單總額(v88 刻意)。殘留的換算幣別 ±5 挪動開 backlog #50。
- 2026-09-24:backlog **#49 隨 v134 完成 (a),(b) 經實測前提不成立、Bar 裁定不做**。
  - (a) 營業時間擠成一串:**成立且更糟** —— Ario 換行切在「美食廣|場」。改為依 ` / ` 一段一行,🕒 與清單分兩欄對齊(懸掛縮排會因 emoji 寬度差 2px,已棄用)。57 筆營業時間只有 P001、P039 用 ` / `,`、` 不切。
  - (b)「永旺 11 個樓層列、合計 495px」:**不成立** —— 實測 6 列、收合 312px。把只有 1 家的 5F／6F 併列只省約 53px,卻打破「一列 = 一層樓」,不做。
  - **本日第三次前提修正**(#46、#49、以及 #41 的量測值):backlog 的數字是當時的推論或 CSS 宣告值,動工前一律以實際渲染重量。
- 2026-09-24:backlog **#46 隨 v133 完成,但原記前提有一半不成立**。
  - 原記「兩顆等寬 `.btn`……狀態卻用了動作的形狀」:**不成立** —— 實測兩顆本來就是 `999px` 膠囊,`04_UI_GUIDELINES` 也明列 `.trip-filter-btn` 為可選取 chip。原記「三個控制擠在一列」:**不成立** —— 旅程中 320px 下三顆為 93／94／93px,無截斷。
  - 仍成立並修正的:選中那顆填滿 `--sea`,看起來像主要動作鈕、讀不出二選一 → 改入 segmented track(加入 ledger 區共用規則,不複製宣告,按鈕維持 44px);另查到 backlog 沒寫的 **`aria-pressed` 缺口** → 兩顆補 `aria-pressed`／`type="button"`,track 加 `role="group" aria-label="行程篩選"`。
  - **教訓同 #31/#37**:backlog 的敘述是當時的推論,動工前要以實測渲染驗證,不能只憑敘述或 CSS 選擇器名稱。
- 2026-09-24:backlog **#48 隨 v132 完成**。原記「出發前的今天頁先寫『今天沒有排定行程』,緊接著卻列出 Day 1 的站點,沒說是哪一天;『還有 N 站,查看完整行程』與『查看完整行程 →』按鈕同一件事講兩次」。
  - 預覽清單上方補「出發當天 · DAY 1 · 10/18 (日)」標頭,沿用 hero 既有的 `.lbl`;「還有 N 站」後半句刪除,交給正下方按鈕。
  - **沿用 `.lbl` 的 `.75` 會不過 AA**:標頭位置比 `TODAY` 低、漸層較亮,mist 4.45／tea 4.47:1。改用同一張 hero 內文 `.empty` 的 `.9`,六主題最低 5.59:1。
  - 標頭刻意不用 `.tomorrow-item`,清單項目數不變,既有斷言不需改。只影響出發前分支。
- 2026-09-23:backlog **#47 隨 v131 完成**。原記「行程頁 Day 1 的 9:00 卡片,航班時刻在 375px 斷在括號中間,`桃園` 被拆開」。
  - **根因不是斷行規則,是資料原文的換行被吃掉**。P000 的「交通時間」欄本來就寫成兩行(`9:00開櫃` / `11:30(TPE台灣桃園)-15:05(OKJ日本岡山)`);`.drive-chip` 沒宣告 `white-space`,換行折成空白、整串變成一個長 run,瀏覽器就在 CJK 任意位置斷開。
  - 改法:`.drive-chip` 加 `white-space:pre-line`。**同一份 CMS 的多行慣例在 `.detail .sec`(資訊面板)早就以 `pre-line` 保留** —— 本次只是讓交通 chip 與它一致,不是新發明的規則。
  - 影響面實測:全 App **28 個不重複交通字串只有 1 個含換行**,其餘 27 個渲染逐字不變;68 個行程項目的「交通」欄全為空,都退回資料庫 `travel` 欄。
  - **否決的做法**:`word-break:keep-all` 在 320px 下整串溢出 chip(實測 `scrollWidth > clientWidth`);補 `overflow-wrap:anywhere` 止血後,兩個純中文交通說明反而各多一行、`🚶` 被獨自留在第一行。為一個字串讓另外 27 個變差,不划算。
- 2026-09-23:backlog **#40 隨 v130 完成**。原記「全 App 235 個 `<button>` 只有 13 條 `:focus-visible`,而且全是個別元素的窄選擇器」。加入兩條通則:
  - `button:focus-visible,[role="button"]:focus-visible,summary:focus-visible,.qa-btn/.nav-btn/.nx-navbtn/.nx-drive-btn:focus-visible{outline:2px solid var(--sea);outline-offset:2px}`
  - `.topbar/.daybar/.today-hero/.ledger-summary-card/.ledger-selection-toolbar/.shopping-selection-toolbar` **內的** button 改 `outline-color:#fff`
  - **關鍵設計判斷**:`outline-offset:2px` 讓焦點環落在按鈕**外面**的頁面底色上,所以 `.btn.cta`／`.btn.danger`／`.qa-btn.drv` 這些**深色按鈕本身不需要例外**;真正需要白環的是深色**容器**裡的按鈕。先以指令碼盤出全部深色背景規則,確認多數是按鈕自身而非容器,才收斂成六個容器。
  - 既有 13 條都是 class 選擇器,特異性高於 `button:focus-visible`,**不受影響**(實測 `.today-pretrip-day` 仍吃自己的 offset 3px 規則)。
  - 驗證:以**真實 Tab 鍵**測到 `.today-jump`(在 `.today-hero` 內)`:focus-visible` 為 true、拿到 `solid 2px rgb(255,255,255)` offset 2px;再以級聯分析確認 `.totop`／`.tabbar-btn` 吃通則、`.settings-btn` 吃白環覆寫。**程式呼叫 `.focus()` 不會觸發 `:focus-visible`**,必須用真實鍵盤事件,這點在驗證這類規則時要知道。
- 2026-09-23:backlog **#44 隨 v128／v129 完成**,下一站串點卡片的三處呈現問題全數處理:
  - **決策鈕截斷(v128)**:原本把站名夾進可見文字(`完成：'+escapeHtml(clusterItemName(current))+'`),375px 下被 `text-overflow` 切成「完成：廣島和平…」。站名本來就無條件顯示在按鈕正上方那行,重複又截斷等於資訊沒增加。改為可見文字只留「完成／跳過」(**與非串點卡片本來的寫法一致**),完整站名移到 `aria-label` —— 螢幕閱讀器拿到的內容不變。
  - **「目前」一詞兩義(v129)**:旁邊的時間是**該站的排定時間**,不是現在幾點。改為「這一站」。
  - **剩餘站數要心算(v129)**:原為 `4 站` 與 `2 站已自動略過` 並排,使用者得自己減。改為「共 N 站」並在 `childPick.remaining > 0` 時補一顆「還有 N 站」。
  - 實測(320px,清空進度後):`這一站 9:00 廣島城`、chips `共 4 站`＋`還有 3 站` 同一行共 118px(容器 234px)、決策鈕 `截斷:false` 且 `aria-label` 正確。六條新增斷言**逐一以改回舊寫法實測確認會紅**。
- 2026-09-23:backlog **#45 經 Bar 裁定採方案 b 關閉,無程式變更**。原記「v125 的副作用:採買清單空狀態裡 ＋ FAB(`--coral`)與『新增第一項採買』(`--t-cta-bg`)兩種橘」。以 v127 真實 CSS 產出六主題對照頁供 Bar 檢視後裁定:**正圓圖示鈕屬 accent 裝飾層,不屬動作角色**,吃 `--coral` 是正確的。
  - **只有海洋(`#df5f3a` vs `#c05232`)與象牙(`#e25a0f` vs `#c74f0d`)兩組會差一階**;其餘四組 `--t-cta-bg` 等於 accent,本來就同色。成因是 v125 只壓深了白字未過 AA 的那兩組,而圓鈕上沒有白色文字標籤(只有一個 `＋`),不受該對比要求約束。
  - 已寫入 `04_UI_GUIDELINES.md` 的「動作角色色」節,並明文寫下**不要為了一致把圓鈕改吃 `--action-cta-bg`** —— 那會連帶改動 `.ledger-fab`,且讓「正圓＝裝飾層」的界線失效。
  - **本項純文件,未動 shell,因此不需 forward bump。**
- 2026-09-23:backlog **#43 隨 v127 完成**。原記為「同一天的進度數字三個畫面互相矛盾」,追查後確認**三個數字各自都對,不存在計數錯誤** —— hero 的分母是 `homeNextStopItems`(只取 `item.act`,**串點併為一站**)且分子 `items.length-(remaining+current)` **含自動略過**;行程頁 day-head 的分母是 `isTripCheckableItem`(`act||place||ref`,**子站各算一站**)且 `doneN` 只算真的打卡完成、略過另計 `skipN`;渲染的 11 張則是 `tripHideDone` 濾掉 3 個略過項的結果。
  - **關鍵發現**:hero 那個數字**早就有正確的 `aria-label`** —— `'今日已處理 '+completed+' 站，共 '+items.length+' 站'`。「已處理」正是能和「完成」區分、涵蓋略過的詞。但畫面上只印裸的 `1 / 8`,**螢幕閱讀器使用者拿到的資訊比看得見的人更準確**。
  - **Bar 2026-09-23 裁定採「已處理」措辭**。v127 只把可見文字由 `'+completed+' / '+items.length+'` 改為 `已處理 '+completed+'/'+items.length+'`,**`aria-label` 與所有計數邏輯一律未動**。320px 實測:左側 `TODAY · DAY 2` 97px、右側 `已處理 1/8` 63px,間距 108px,無溢出。
  - **刻意沒做的事**:未把兩個分母「統一」成同一個數字。兩者各有用途(hero 服務下一站流程、day-head 服務打卡清單),硬統一會讓其中一邊失去意義。
- 2026-09-13:backlog **#39 隨 v125 完成**。`--action-destructive-*` 名實不符的收斂,依 Bar 2026-09-13 裁定採「**改名＋定色**」而非原記的「純改名、零視覺變更」—— 因為 `--coral` 就是 `--t-accent`,**它從來不是固定紅**:六主題下分別是橙紅／橙／粉紅／橙／琥珀／**藍**(焙茶 `#405c7a`)。刪除鈕的顏色跟著佈景主題跑,與「高風險操作要有穩定訊號」正好相反;而且 coral 同時是提交色,刪除與儲存永遠同色。
  - **destructive 改為不隨主題的固定紅 `#8c1d2c`**(白字 9.02:1,紅字對各主題卡片 8.63–9.02),比照既有的 `--green`／`--gold` 固定語意色慣例。
  - **CTA 另立 `--action-cta-*`**,由新增的第 15 個主題 token `--t-cta-bg` 供色(照 v121 加 `--t-select-bg` 的同一手法)。只有海洋 `#df5f3a→#c05232`、象牙 `#e25a0f→#c74f0d` 需要壓深以通過 AA(白字 3.60／3.68 → 4.67／4.61),**色相位移 0–1°**;其餘四組沿用原 accent。這同時解掉 F1 最後一組對比缺陷。
  - **已知弱點(Bar 已裁定接受)**:藤紫的 CTA `#c0416e` 與固定紅只差 13° 色相。緩解採 Bar 核定的前兩項 —— (1)靠明度拉開(4.97 vs 9.02,底色明度比 1.81);(2)紅色不是唯一防線,兩個真正破壞性的站點本來就在二次確認對話框後面。第三案(改藤紫 accent)因 v110 準則禁止改動六主題的 13 個 `--t-*` 值而排除。
  - 連帶處理 **D1**(「退回」是對話框的主要動作,歸 CTA)與 **D2**(「改回未記帳」只解除連結、不刪資料,拿掉 `class="danger"`)。`04_UI_GUIDELINES` 的「不要依 token 名稱把 `--action-destructive-*` 改成警告紅」限制隨本項落地而解除,該節已改寫。
- 2026-09-12:**backlog #37 經查證前提錯誤而關閉,不實作**。原記「`.ledger-proxy-switch` 的三個裸 hex 應改用 accent 家族」,但 `tests/ledger-form-223.test.js` 斷言 `.ledger-sheet-field>label.ledger-proxy-switch` 的 `background:#f4e9e6` 與 `border:1px solid #c99c94` 為 **approved**(措辭與 `presentationTokens` 的「approved non-theme scale」一致),`07_CHANGELOG.md` 亦載明代購一律套「coral／淡紅底」—— **那是「代購」的語意色,全 app 一致使用(badge 與開關),刻意選定而非疏漏**。實作時該測試當場擋下,已全數撤回。**今日第二次由自動測試擋下基於錯誤前提的「修正」**(前一次為 #31)。
- 2026-09-12:backlog #35／#36 隨 **v117** 完成。#36 讓「幫誰買」的已選 chip 帶可見的 accent 邊框,與「分類」那組的選取強度一致(色系刻意維持不同);#35(b) 把 `.brand .sync` 的 20px 圓角收斂為 999px(該元素高 44px,原本差 2px 不成膠囊),並在 `04_UI_GUIDELINES` **正式承認 8／9px 為既有主力值** —— 讓文件承認現實,而非硬把 17 種圓角套回 4 種。
- 2026-09-12:backlog #30／#32／#33／#34／#35(a) 隨 **v116** 完成。#30 刪除 `manualSync`／`manualSyncNew` 兩行死碼與 `atomic-sheet-sync.test.js` 中隨之空轉的負向斷言;#32 多品項帳單摘要列補標籤、改用既有的相對日期、類別加註「預設」、順序對齊單品項、chevron 改為 `.chevron` 旋轉、補 `open` class 使其與展開面板接成連續容器;#33 抽出共用的 `installOverlayDismiss(overlay,close,opts)` 並套用於照片修復／照片檢視器／記帳 sheet(後者 `swipe:false`,避免與捲動衝突)、移除底部「取消」、sheet 背景保留區 12px→56px 讓點背景關閉在多品項模式也可用;#34 定義 `--mint:#d6e8e4` 修好 8 條規則靜默失效的背景;#35(a) `.toast-action` 與 `.trip-back-now` 由膠囊改為 `.btn` 的 9px 矩形。
- 2026-09-12:**backlog #31 經查證前提錯誤而關閉,不實作**。原記「`--entry-secondary-*` 不跟主題走是疏漏」,但 `tests/theme-system.test.js` 的 `presentationTokens` 明列它們為**核定的非主題呈現 token**並逐一斷言其固定值,`04_UI_GUIDELINES` 亦寫明「跨主題固定的 pending、entry-secondary、Shopping category」。實作時該測試當場擋下,遂全數撤回。`.ledger-proxy-switch` 的寫死值同屬此類,一併維持原狀。**這是自動測試擋下一次基於錯誤前提的「修正」。**
- 2026-09-11:backlog #27 完成。測試檔的 shell generation 硬編碼遷移:74 處 `shell/v114/...` 全數改由 `tests/support/version.js` 推導,涵蓋 58 個測試檔。helper 新增 `shellPath(file)` 與 `appHtml()`,把主流的 `fs.readFileSync('shell/vNNN/index.html','utf8')` 收斂為 `appHtml()`;順帶移除 39 個因此不再需要的 `fs`／`path` require。合成 fixture 依 Bar 2026-07-30 裁定保留字面(`doc-generation` 的 v898–v900、版本完整性 fixture 的 v111)。**以竄改 `sw.js` 版本為 v999 實證解耦**:75 個測試跟著推導失敗(72 個路徑 ENOENT + 3 個 generation 一致性斷言),20 個不碰 shell 故不受影響;還原後 95/95 與四個 gate 全過。
  - **⚠ 2026-09-23 補記(做 v131 時發現)**:#27 的遷移是掃 `tests/*.test.js` 裡的 `shell/vNNN` 字面,所以**掃不到本來就沒寫 generation 路徑的檔案**。`tests/preview-date.test.js` 與 `tests/trip-presentation.test.js` 讀的是 root `index.html` —— 也就是 byte-locked 的 **v110 bridge**,不是現行 generation。兩檔合計 **13 條斷言**(4 + 9)。
    - **今天沒有假綠燈**:把兩檔的讀取路徑改指 `shell/v131/index.html` 實測,兩檔仍全過 —— 被斷言的字串在現行 generation 也還在。
    - **但它們守不到現行 App**:bridge 是凍結的,內容永遠不變,因此無論現行 generation 怎麼漂移,這 13 條都會一直綠。#27 記的「升版一個測試檔都不用改」在這兩檔身上,是因為它們根本沒在看現行世代。
    - **未處理,留作已知缺口。** 要修就是改用 `appHtml()`,但得先逐條確認斷言在現行 generation 的對應位置;`preview-date.test.js` 另有一點要注意 —— 它結尾沒有像其他測試檔那樣印通過訊息,跑過與沒跑過在輸出上看不出差別。
  - **✅ 2026-09-24 已補**:兩檔改用 `tests/support/source.js` 的 `readIndexHtml()` 與 `extractFunction()`,斷言內容一條未改。改前在現行 generation 做五種破壞(翻轉 `tripHideDone` 預設、拿掉「現在」徽章、改機場／加油標籤、改 `previewDate` 參數名),兩檔**全部漏掉**;改後**五種全部抓到**。另掃過全部測試檔,確認只有這兩檔是缺口(`pwa-shell` 讀 bridge 是刻意的)。
- 2026-09-10:backlog #26 完成。`qa.yml` 的 `actions/checkout` 與 `actions/setup-node` 由已棄用 Node 20 的 `@v4` 升到 `@v7`(四處),兩個 action 自 v5 起即以 node24 執行,GitHub 的棄用 annotation 消除。**未採 backlog 原文寫的 `@v5`**:該建議寫於 2026-07-31,當時 v5 是最新;現行最新為 checkout v7.0.1／setup-node v7.0.0,升到 v7 可避免三個月後再修一次,且 v5–v7 的 runtime 同為 node24。已核對破壞性變更:setup-node v5／v6 的自動快取只在 `package.json` 有 `packageManager` 欄位時觸發,本專案沒有該欄位且 `package-lock.json` 存在,`browser-qa` 的顯式 `cache: npm` 行為不變;checkout v7 只新增 fork PR 於 `pull_request_target`／`workflow_run` 的封鎖,本 workflow 未使用這兩個事件。
- 2026-08-11：backlog #22 完成。採用專用 HID 而非 PID 作為 Hotel profile join key：公開 Places L1 新增 `HID`,L4／L15／L24／L33／L42 分別讓 P002／P013／P022／P031／P040 引用 H001；五筆 travel 值原樣保留。Schema 3.0、BUILTIN、條件式 Validator 與 runtime exact resolver 已同步,住宿／Hotels 名稱改為只供顯示；Ledger 維持位置式 21 欄 Schema 2.9,個人備份維持 v9。
- 2026-08-10：backlog #24 於 v99／v100 完成雙版本實驗後，由 Bar 裁定取消而非功能完成。實機顯示時機與使用者已看到新版內容的時間軸不一致，必要性不足以支持跨資源 generation 協議；v101 完整移除全域更新提示與明確 reload action，保留原 SW lifecycle、cache strategy、離線 fallback 與設定頁版本資訊。未來若重啟須視為新需求重新設計。
- 2026-08-09：backlog #4 與 #11 完成；BUILTIN 已由東京／新宿舊資料刷新為現行岡山四國六天五夜，Ledger 種子改為 schema 推導的 21 欄空 header、TripConfig 八 key 各一次。新增預設只讀、明確 `--write`、不抓 live Ledger、原子替換與回讀驗證的刷新工具，完整操作與權責 SOP 見 `16_OPS_PLAYBOOK.md` §G；維持 SW v98。
- 2026-08-09：backlog #3 的採買明細回饋完成；記帳摘要以「筆」計算並合併到既有「狀態」列，footer 依未開始／部分完成／待確認切換為「記帳」／「繼續記帳（剩 N 筆）」／disabled「等待狀態確認」。逐 allocation 記帳紀錄與 Buy-to-Ledger domain／workflow 不變。
- 2026-08-09：Bar 裁定關閉 backlog #2 最後一項「未來 TEST 模擬版 localStorage 前綴隔離」，不實作。現行正式站與 dev 測試站分屬不同 origin，自動測試使用隔離環境，診斷時間模擬已有快照／還原與備份防呆；repo 亦禁止提交同源 TEST HTML，因此目前沒有需要前綴隔離的實際執行路徑。未來若重新引入同源、可寫入狀態的 TEST 模擬版，須作為新需求重新評估。
- 2026-08-09：Ledger 個人／團體所有清單卡隱藏付款方式，消費明細與支付方式篩選仍保留；單筆第一行只留品項與代購／付款分攤。多品項父卡改為嚴格兩行，團體顯示「付款人 · 分攤依品項」，展開子項保留精確分攤與狀態；內容靠左、垂直置中，金額固定右側。
- 2026-08-09：Ledger 個人／團體近期消費卡嚴格收斂為兩行；第一行「品項／付款方式／代購或付款分攤」，第二行「店家／類別／免稅／TEST／待同步／鎖帳或更正」，320／375／390px 一律 single-line ellipsis。團體付款分攤與鎖帳／更正使用原 neutral 配色，待同步保留原黃色，個人代購保留 coral；右側金額、所有狀態判定及帳務／資料層不變。
- 2026-08-09：Ledger 近期消費卡資訊階層微調完成；團體付款／分攤摘要由下方 badge 移到品項旁，個人與團體類別統一接在店家後，支付方式獨立留在下一列；缺店家仍保留類別，缺支付方式不產生空白列。只改 presentation renderer／CSS，帳務與資料層不變。
- 2026-08-09：品質批 #2 網路／呈現降級強化完成；`fetchSheet()` 第一次失敗保留既有 Sync log，精確等待 800ms 後只重試一次，第二次失敗仍將第二次錯誤交回 snapshot orchestration；`toast()` 在 `#toast` 不存在時於任何 action／timer 狀態變更前安全返回。未改抓取 timeout、CSV 驗證、同步資料語意、renderer、SW 或版本。
- 2026-08-09：品質批 #2 的 AppLog／healthCheck 子項完成；六類 AppLog 保留 console 相容輸出並增加 session-only 100 筆環形緩衝（單筆 1,000 字），診斷面板可查看、複製及清除，開啟面板不會製造 health log。依 Bar 要求移除面板內的團體帳測試模式區塊；設定控制頁與 TEST universe 保留。
- 2026-08-09：品質批 #2 的下一站副作用子項完成；`trip-progression.js` 純 reconciliation 集中時間／cluster／stale policy，render path 同輪最多保存一次 progress並通知一次。
- V2 Schema 驅動 CMS:7 張 Google Sheets、ID 引用、Restaurants/Shopping/Hotels/Expenses/TripConfig。
- AI Harness 治理層:PROJECT_CONSTITUTION、10_FOLDER_STRUCTURE、11_CODING_CONVENTION、12_DEV_WORKFLOW、adr/0001-0005、健康檢查規範。
- 停車引用繼承:「停車同Pxxx」完整繼承與 MAP CODE 純顯示。
- PWA 離線基礎:三層防線、Service Worker、Netlify 託管。
- 首頁下一站模式:首頁只突出下一站,完成 / 跳過 / 復原狀態存 localStorage,不回寫 CMS。
- 首頁天氣摘要:依下一站資料推估地點,顯示簡短天氣 chip,失敗時不影響首頁。
- Restaurants 補欄位:R001 麵酒一照庵與 R006 上野商店的 Tabelog 評分 / 營業時間已在 Google Sheet 發布 CSV 確認。
- 購物頁多地點切換:GitHub `origin/main` 已確認包含 `Places.Type=購物` 來源、`全部 / 想逛 / 各購物地點` 切換與「區域 / 樓層」文案。
- 框架抽取計畫已歸檔:`FUTURE_PLAN_framework-extraction.md`。
- 2026-07-16:父列具有地點或 ID 時納入父子行程卡第一站，兩站即可成卡；synthetic controller 保持整組進度，Day 1–6 共 12 組稽核案例通過。
- 2026-07-29：Bar 完成 SW v58–v68 累積真機驗收；涵蓋團體帳本可見性／權限、採買 A／B／C／D／E／F／G、逐人代購記帳、部分購買、安全回併、必買置頂、獨立新增／編輯 Sheet、Ledger 草稿切軌、iPhone Safari／PWA 鍵盤焦點與更新後本機資料保留。
- 2026-07-29：GitHub Pages 最終 iOS PWA 驗收完成；包含加到主畫面、standalone、真機離線重開與 `github.io` origin 的 Service Worker 更新節奏。
- 2026-07-29：採買清單批及 C＋E＋G 第三批完成 Bar 驗收，自 backlog 移入 done。
- 2026-07-29：結算一致性批完成本機開發與自動化／Browser QA，自 backlog 移出；交付含還款確認後永久保護、append-only 收據級更正／作廢、commit-last、canonical conflict、差額預覽與完整歷史。SW v69–v71 後續於 2026-07-30 完成 Bar 真機驗收；`dev → main` 與正式部署仍未核准。
- 2026-07-30：Bar 完成 SW v69–v71 真機／PWA 驗收；涵蓋結算一致性、分攤成員選取色差與整張作廢預覽動作去重。`dev → main` 與正式部署仍須另行核准。
- 2026-07-30：backlog #1 Playwright 三情境 QA 入版控並掛入 `qa.yml`；斷網內建、連網同步與旅行日 mock Date 三情境均以真實 App 啟動流程驗證，通過標準為 `pageerror=0`。

## 2026-08-11 新歸檔：backlog #22

> 本節是 v102 HID migration 完成後的當代歸檔,不屬於 2026-07-30 批次一 P0／P1 複驗。

| 編號 | 完成日 | 對應 SW 版本 | 狀態 |
|---|---|---|---|
| #22 | 2026-08-11 | SW v102 | 完成；以 HID 落實 N→1 Hotel profile 精確關聯 |

- **#22 Hotels profile 精確關聯** — 原 backlog 原文（verbatim）：`22. **Hotels 名稱比對改良評估**:現以名稱掛 Places,名稱異動會懸空;評估改 PID 引用(涉及 schema,需五段提案)。` 執行時選擇 HID 而非 PID,因為多個帶不同交通脈絡的 Places 停靠點可共用一個 Hotel profile。遷移證據：公開 Sheet 的 `地點!L1` 為 HID；`L4/L15/L24/L33/L42` 均為 H001,分別對應 P002／P013／P022／P031／P040,且 travel 仍為開車30分鐘／開車2小時／開車3分鐘／開車50分鐘／步行3分鐘；其餘 HID 儲存格皆空。程式證據：`schema.js` Schema 3.0、`09_SCHEMA_MAPPING.md` 產物、BUILTIN、`validator.js` 條件驗證、`hotelOf()` exact HID resolver 與 focused Node／Browser tests。

## 已歸檔的 backlog 編號項目（2026-07-30 起）

> 2026-07-30 依 Bar 裁定第 4 項建立本表。**編號保留不回收**(見 `tasks/backlog.md` 檔頭)。歸檔判準為「程式與文件證據足以證明已完成」,**不以真機／PWA 驗收為條件** — 驗收已另列為 release gate,見 `tasks/current.md`。#1／#3b／#6–#10／#21 於批次一 P0／P1 逐項複驗；#23 與 #24 分別於表列完成日依當時決策與證據後續補入,不宣稱經過 2026-07-30 批次一複驗。

| 編號 | 完成日 | 對應 SW 版本 | 狀態 |
|---|---|---|---|
| #1 | 2026-07-30 | 不涉 SW 版本(純測試資產) | 如原核准完成 |
| #3b | 2026-07-30 | SW v72(個人備份 v8) | 已完成,原 backlog 敘述過期 |
| #6 | 2026-07-30 | SW v72 | 完成,**範圍擴張,已由 Bar 追認** |
| #7 | 2026-07-30 | SW v72 | 如原核准完成 |
| #8 | 2026-07-30 | SW v72 | 如原核准完成 |
| #9 | 2026-07-30 | SW v72 | 完成,兩項以不同形式交付,**已由 Bar 追認為等價** |
| #10 | 2026-07-30 | SW v73 | 如原裁定完成(顯示層) |
| #21 | 2026-07-30 | SW v73 | 完成,**範圍如實記錄於下** |
| #23 | 2026-08-03 | 不涉 SW 版本 | **關閉,不實作**:12 月東京行程已結束,不再需要接入 |
| #24 | 2026-08-10 | SW v99／v100 實驗；v101 移除 | **取消,非完成功能**:提示時機與已顯示內容不同步,不再維護 |

- **#1 QA 腳本入版控** — 證據:`tests/browser/trip-three-scenarios.spec.js` 三個 `test()`(斷網內建 / 連網同步 / 旅行日 mock Date)、`tests/browser/support/qa-fixture.js`、`static-server.js`、`.github/workflows/qa.yml` 的 `browser-qa` job。只新增測試資產、無 runtime 變更,故不對應 SW 版本。
- **#3b 採買單位納入個人狀態備份** — 證據:`index.html:7421` `personalStateJson()` payload 含 `shoppingUnits:shoppingUnitStore.all()`;`index.html:7497` 還原寫回 `SHOPPING_UNIT_OPTIONS_KEY`,且列於原子回滾 keys;`index.html:3815` `PERSONAL_STATE_VERSION=8`,註解明載「v8 起加入本機主題、採買單位與旅途紀錄」;`tests/settings-backup-ux.test.js:145` 斷言 v8 匯出鍵含 `shoppingUnits`;`07_CHANGELOG.md` 2026-07-30 條目。
  - **原 backlog 敘述過期**:原文寫「目前不在備份 payload 內」與「目前 v7」,兩者在 v72 交付後均已不成立。歸檔而非重寫,是因為需求本體已滿足。
  - **殘留缺口(不回填 backlog,已列入批次一 P3)**:`tests/settings-backup-ux.test.js` 只覆蓋 v1／v2／v4／v8 還原,**v3／v5／v6／v7 無任何還原測試**。依 Bar 裁定第 2 項,不升 v9、維持 `PERSONAL_STATE_VERSION=8`,改補 v1–v8 還原矩陣測試與相容策略文件化。
- **#6 主題系統** — 證據:`index.html:616` `THEME_IDS=['ocean','ivory','wisteria','cedar','mist','tea']`、`:617` `THEME_REGISTRY` 六筆;`tests/theme-system.test.js`(59 條斷言)。附帶修正已完成:`index.html:39` `--green:#367055`,舊值 `#3c8062` 全檔無殘留。預設主題經複驗仍為 `ocean`(`THEME_IDS[0]`,且 `normalizeThemeId()` 對未知值回退 `ocean`)。
  - **範圍擴張,如實記錄**:核准範圍為「共三選項」(2026-07-17)→ 鬆綁為「三案並列、最終選項數三或四待 Bar 裁定」(2026-07-30);實際交付 **6 組**。核准內的三案為 `ivory`／`wisteria`／`cedar`;**`mist`(霧藍／瀨戶)與 `tea`(焙茶／倉敷)未經任何核准即納入交付**,且選項數超出「三或四」。**已由 Bar 於 2026-07-30 追認為正式交付現況**,並要求立 ADR 記錄未來閘門 → `adr/0008-theme-system-scope.md`。
- **#7 主題區掛入準備** — 證據:預留骨架已被實作取代,`renderThemeSettingsSheet()`(`index.html:7641`)與 `renderSettingsThemePage()`(`index.html:7647`),`SETTINGS_PAGE_IDS`(`index.html:7606`)含 `'theme'`。
- **#8 UI 配色規範覆寫** — 證據:`04_UI_GUIDELINES.md:7` 已改寫為兩層 token 制(13 個第一層 `--t-*`;第二層保留 `--paper`／`--sea-deep`／`--coral` 等角色名並只能 `var()` 對映第一層)、`:18` 固定色 `--green #367055`;`08_AI_HANDOVER.md:39` 載明主題只可透過 `data-theme` 覆寫第一層 token。原「UI 配色變數不可變」條文已由上述條文取代。
- **#9 設定頁 2.0 批** — 七項子範圍中 **五項如原文交付、兩項以不同形式交付**:
  - ✅ 分區架構 — `renderSettingsRoot()`(`index.html:7627`)七區:身分 → 主題 → 代購對象 → 帳務 → 自訂項目 → 資料與版本 → 測試模式
  - ✅ SVG 齒輪入口 — `index.html:687` inline SVG(`.settings-btn`,`aria-label="設定"`)
  - ✅ 摘要計數列 — 主題名稱＋「6 組主題」、「N 位常用對象」、「N 類別 · N 支付方式 · N 單位」、匯率與預設幣別
  - ✅ 代購對象管理移入設定頁 — `openSettingsPage('proxy')` → `renderSettingsProxyPage()`
  - ✅ APP_VERSION 版本資訊列 — `renderSettingsDataPage()` 顯示 `SW v72`,取自 `APP_VERSION`
  - ⚠️ 使用者版更新日誌**子頁** → 實際**併入「資料與版本」子頁**內(`APP_RELEASE_NOTES` 五筆 + `renderAppReleaseNotes()`);`SETTINGS_PAGE_IDS` 中沒有獨立的更新日誌頁
  - ⚠️ 成員管理**子頁** → 實際為身分區行內「切換／新增」兩鈕 + 既有 `openMemberSelector()` overlay,非獨立子頁
  - **上述兩項差異已由 Bar 於 2026-07-30 追認為等價交付**,不另立獨立子頁:更新日誌併入「資料與版本」子頁視為符合現行資訊架構;成員管理以身分區行內「切換／新增」入口搭配 `openMemberSelector()` overlay 視為等價,理由是功能無缺漏且不增加額外導覽層級。兩項差異與 `07_CHANGELOG.md` 2026-07-30 條目一致(該條目只列四個子頁:代購對象、帳務、自訂項目、資料與版本)。**#9 維持完成,不新增 backlog 項目。**

- **#21 Sanity CI dev 觸發評估** — `qa.yml` 的 `push.branches` 加入 `dev`,sanity job(文件標題／manifest／版本一致性／全部 `tests/*.test.js`)在 `dev` 每次推送都執行,原項目要的「dev push 也產生 GitHub Actions 綠勾」已達成。
  - **範圍如實記錄**:`browser-qa` job 依 Bar 2026-07-30 裁定**刻意維持只在 pull request 與 `main` push 執行**,以 job-level `if` 條件排除 dev push,避免每次 dev 推送都安裝 Chromium 跑完整 Playwright。原 backlog #21 只談 sanity 的 dev 觸發,未涵蓋 browser-qa;**本次不另立「dev 也跑 browser-qa」的新項目**(依裁定不新增 backlog 項目)。日後若要放寬,屬新決策。

- **#10 受保護紀錄 Tag 文案改為「已鎖帳」** — badge 由「還款確認後保護」縮短為「已鎖帳」(`renderLedgerRecentRecord`,複驗確認為整份 `index.html` 的唯一出現處);明細頁**新增**說明句「此筆消費已完成還款確認,目前已鎖帳,無法再編輯或刪除。」,出現條件與「查看不可改寫歷史」按鈕相同(`track==='shared' && record._correctionProtected`)並排在其前。`_correctionProtected` 判定、編輯／刪除守門、還款確認流程與不可改寫歷史一字未動;`assertCanEditLedgerRecord`／`assertCanDeleteLedgerRecord` 的錯誤訊息作為行為契約亦未更動。上述各項已由 `tests/ledger-list-actions.test.js` 逐項鎖住,含「舊文案已從整份 `index.html` 移除」。既有 badge 優先序不受影響:`_correctionVersionCount > 0` 仍優先顯示「已更正 N 次」。備選字「已鎖定」依原裁定不採用。

- **#2 的子項「隱藏『重置今日進度』」** — 2026-07-30 由 P5 調查發現**早已實作完成**,只是 backlog 未歸位。實作為 `resetTripProgress()`(`index.html`),位於診斷面板「行程進度」區,附雙重 `confirm()`,只清除 `trip_checks` 與 `trip_next_stop_progress`。
  - **與原文的差異(如實記錄)**:backlog 原文寫入口是「連點標題 5 下」,實際入口是**桃子診斷徽章 300ms 內連點兩次 `touchend`**(`setupDiagnostics()`);`brandTitle` 上沒有任何 listener。因為只綁 `touchend`,桌機滑鼠點擊打不開,實際上比原構想更難誤觸。經 Bar 2026-07-30 裁定移出 #2。
  - #2 的其餘子項中，下一站 reconciliation、AppLog 環形緩衝、fetchSheet 退避與 toast() null guard 已於 2026-08-09 完成；最後一項 localStorage 前綴隔離亦於 2026-08-09 由 Bar 裁定因目前沒有實際執行路徑而關閉、不實作。

- **#23 12 月東京行接入** — Bar 於 2026-08-03 確認該行程已結束,因此不新增行程分頁、不擴充 `TripConfig transport=transit`、不新增 SHEETS gid。本項是需求失效後關閉,**不是功能交付**；編號永久保留不回收。
- **#2 已由後續版本完成或關閉** — 行程面板展開狀態於 v82 完成；天氣改取「現在之後」最大值於 v84 完成；同步徽章相對時間與 partial 失敗來源於 v88 完成；下一站 reconciliation、AppLog／healthCheck 診斷能力、fetchSheet 退避與 toast() null guard 於 2026-08-09 完成。最後一項 TEST 模擬版 localStorage 前綴隔離由 Bar 於 2026-08-09 裁定關閉、不實作；backlog #2 已完全收斂。
## 文件治理
- 2026-07-13:Netlify 雙站架構上線(`main`=正式站、`dev`=測試站)，兩站部署與瀏覽器狀態完全隔離。
- 2026-07-10:修復批交付(事故處理規範 §C、雙通道 SOP §D、檢查器三新規則、CI 全測試涵蓋、測試檔治理)。
- 2026-07-09:下一站邏輯統一為時間判斷 + 自動略過過期項目(修復卡住不推進的 bug)+ 明日預告規則修正 + 新增 pick-next-stop 測試。細節見 07_CHANGELOG。
- 2026-07-09:Sanity CI 上線(qa.yml + check-doc-titles.js,防上傳錯位)+ README 閱讀順序補 15/14/16 + done.md 日期修正。
- 2026-07-09:治理層 v2 修正交付(狀態收斂、文件權威=GitHub、00 定位歷史快照、新增 14/15/16、tests 交付必附規則、憲章與 manifest 同步)。細節見 07_CHANGELOG。
- 2026-07-08:依 Bar 最新決策更新任務板:先等 Day4-6 Sheet 補完,再手機驗收、打包與 Netlify。
- 2026-07-07:GitHub 最新資料同步後,新增 project status 並更新任務板規畫進度。
- 2026-07-06:Codex Ready 文件一致性修正,對齊 README / handover / task board / changelog。

## 更早的狀態快照

2026-07 到 2026-11-01 從 `tasks/current.md` 移出的逐版狀態段落,已原文搬到 [`docs/archive/tasks-current-snapshots-2026-07_to_2026-11-01.md`](../docs/archive/tasks-current-snapshots-2026-07_to_2026-11-01.md)(2026-11-12)。
