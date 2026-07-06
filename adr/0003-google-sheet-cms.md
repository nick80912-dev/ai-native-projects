# ADR 0003 — Google Sheet 作為 CMS

**Decision**:Google Sheets 為內容管理系統(7 張工作表),App 於使用者手機端直接抓取「發布到網路」的公開 CSV 渲染。無後端、無資料庫伺服器。

**Context**:Bar 不會程式,需能自行維護所有旅遊內容;團隊多人需共同編輯;預算為零、不想維運伺服器。

**Alternatives Considered**:①硬編碼 JSON(每次改內容都要工程介入,否決);②自建後端+資料庫(有月費與維運,Bar 無力維護);③Notion/Airtable API(需 API key 與額度,較複雜);④Google Sheets 發布 CSV(Bar 熟悉、免費、支援多人共編、零維運)。

**Why This Decision**:Sheets 是 Bar 已會用的工具,共編天然支援;發布 CSV 免驗證即可讀;完全免費零維運;配合三層防線(內建→快取→背景同步)可離線。

**Expected Benefits**:Bar 完全自主維護內容;新增地點/餐廳/店家只加資料列不改程式;團隊即時共編;零成本。

**Trade-offs**:發布 CSV 為公開(旅遊資料可接受);Google 對自動抓取有 robots 限制(讀取改走 Drive 連接或使用者瀏覽器);read_file_content 只回第一張表(需逐 gid 抓)。

**Future Impact**:資料層永遠以 Sheet 為權威來源;程式端個人狀態(打卡/記帳)存 localStorage 不回寫 CMS。與 0001 相依。
