# tests — 測試資產(交付必附)

> Bar 於 2026-07-09 核准:自此之後,**每次程式交付必附與修改範圍相符的可執行測試**,測試檔納入 repo 版控;「通過自動測試」以 repo 內可重跑的腳本為準,不接受口頭宣稱。三情境完整 QA 仍須另行驗證。

## 現有測試
- `schema-types.test.js`:驗證 Places.Type 必要中文輸入值的正規化結果,並確認 `index.html` 內嵌 Schema 已同步。執行:`node tests/schema-types.test.js`。
- `render-note.test.js`:備註條列渲染、下一站卡、MAPCODE、明日預告等元件渲染回歸測試(Node 內建 assert,從預覽 HTML 抽函式驗證)。執行:`node tests/render-note.test.js`(於 repo 根目錄)。
- `pick-next-stop.test.js`:下一站時間判斷與自動略過過期項目的邏輯回歸測試(2026-07-09 新增,涵蓋「今天按過任一完成後就卡住不推進」的修復)。執行:`node tests/pick-next-stop.test.js`
- `data-reference-consistency.test.js`:驗證行程餐廳顯示名稱與 RID 指向餐廳不一致時 health check 會告警。執行:`node tests/data-reference-consistency.test.js`。
- `ios-viewport-resume.test.js`:驗證 iOS 回前景時還原 viewport、清除舊 transform 並保留捲動位置。執行:`node tests/ios-viewport-resume.test.js`。

## 待建(backlog #3,下次程式交付一併補齊)
- Playwright 三情境 QA 腳本:①斷網內建 ②連網同步 ③旅行日 mock Date;通過標準=三情境零 pageerror。
- 打包前離線回歸(SW 快取)腳本。

> 在上述 Playwright 腳本納入 repo 前,三情境 QA 是人工/瀏覽器驗收要求;不得將既有 Node 測試寫成「Playwright 已通過」。

## Sanity CI(2026-07-09 起)
- `.github/workflows/qa.yml` 於每次 push / PR 自動執行:①`tools/check-doc-titles.js`(文件標題/檔名一致性+manifest JSON 檢查,防上傳錯位)②`tests/` 內全部 `*.test.js`。
- 上傳/commit 後到 GitHub 的 **Actions** 頁看結果:綠勾=通過;紅叉=點進去看哪個檔案錯位或哪個測試失敗。
- Playwright 三情境待驗收穩定後加入(backlog #3),屆時掛進同一 workflow。

## 規則
- 測試只依賴 Node 內建模組或 devDependency 明列的工具;引入新測試框架屬技術棧變更,走五段提案。
- 測試檔命名:`<對象>.test.js` / `<情境>.spec.js`;測試不得修改任何來源檔。
