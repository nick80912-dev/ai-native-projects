# tests — 測試資產(交付必附)

> Bar 於 2026-07-09 核准:自此之後,**每次程式交付必附可執行測試**,測試檔納入 repo 版控;「通過 QA」以 repo 內可重跑的腳本為準,不接受口頭宣稱。

## 現有測試
- `render-note.test.js`:備註條列渲染回歸測試(Node 內建 assert,從預覽 HTML 抽函式驗證)。執行:`node tests/render-note.test.js`(於 repo 根目錄)。

## 待建(backlog #3,下次程式交付一併補齊)
- Playwright 三情境 QA 腳本:①斷網內建 ②連網同步 ③旅行日 mock Date;通過標準=三情境零 pageerror。
- 打包前離線回歸(SW 快取)腳本。

## 規則
- 測試只依賴 Node 內建模組或 devDependency 明列的工具;引入新測試框架屬技術棧變更,走五段提案。
- 測試檔命名:`<對象>.test.js` / `<情境>.spec.js`;測試不得修改任何來源檔。
