# 13 Project Status

> 更新於 2026-09-09。
>
> **即時狀態的唯一權威是 `tasks/current.md`**(`.ai-manifest.json` 的 `current_status.authority` 明定)。
> 本檔在 2026-08-01 之前是手抄的狀態快照,結果落後了 40 個版本仍無人察覺 —— 兩份手工維護的狀態表必然漂移。
> 因此本檔**不再複述**線上版本、待辦與驗收進度,只保留一項:**不隨版本變動的風險提醒**。

## 現在是什麼狀態

看 `tasks/current.md`(現在線上是什麼／dev 上是什麼／下一批要做什麼)。
里程碑看 `06_ROADMAP.md`,逐版交付紀錄看 `07_CHANGELOG.md`,正式待辦看 `tasks/backlog.md`。

## 風險與注意(長期有效,與版本無關)

- 內容修訂一律走 Google Sheets,程式端不硬改資料。
- 天氣摘要失敗時應隱藏,不阻塞首頁。
- 個人狀態只存 localStorage,不進 CMS;採買照片 Blob 只存目前裝置 IndexedDB,不進備份或跨裝置同步。
- Hotels 以「名稱比對」掛 Places 是已知脆弱點(名稱異動會懸空),列於 `tasks/backlog.md` 觀察。
- 修改核心架構、schema、Google Sheet 欄位、既有 ADR、或 14 定義的高風險檔案前,必須先取得 Bar 確認。
- `sw.js`、`shell/v119/app-version.js` 與 `netlify.toml` 的 cache header 屬同一 PWA 風險群組(見 14);升版時版本字串必須同步,否則 CI 的 `tools/check-app-version.js` 會失敗。
- 文件裡的 `shell/vNNN` 路徑由 `tools/check-doc-generation.js` 守住,活文件不得停在舊 generation;歷史文件(`adr/`、`07_CHANGELOG.md`、`tasks/done.md` 等)刻意豁免。
- Git 推送與自動驗證**都不等於**正式站部署,也不等於 Bar 的實機驗收 —— 三者必須分別確認。
