# 07 版本紀錄

紀錄格式:日期 / 版本 / 重點。細節不展開,新變更往上加。

## 2026-07-07 — 首頁下一站模式實作計畫
- 新增 `docs/superpowers/plans/2026-07-07-home-next-stop-mode.md`
- 將首頁下一站模式拆成狀態記憶、下一站判斷、票卡畫面與驗收任務
- 本次僅新增實作計畫,尚未修改 App 功能
- Breaking Change:無

## 2026-07-07 — 首頁下一站模式設計規格
- 新增 `docs/superpowers/specs/2026-07-07-home-next-stop-design.md`
- 定義首頁只突出下一站的旅途中 UX 方向
- 明確限制不新增分頁、不改 schema、不改 Google Sheet、不回寫 CMS
- Breaking Change:無

## 2026-07-07 — 03/05 文件一致性修正
- 修正 03_DATABASE.md 與現行 schema.js / 09_SCHEMA_MAPPING.md 不一致問題
- 將 03_DATABASE.md 重新定位為 CMS 快速概覽,不再作為欄位權威來源
- 修正 05_CODING_RULES.md 中 rowsToObjects / CONFIG 等過時術語
- Breaking Change:無

## 2026-07-06 — Shopping 想逛清單 UX 修正
- 修正 Shopping 分頁 UX:加入或取消想逛清單後,樓層展開狀態會保持,不再自動收合
- Breaking Change:無

## 2026-07-06 — Codex Ready 文件一致性
- README 第一閱讀順序改為 `.ai-manifest.json` → `PROJECT_CONSTITUTION.md` → `08_AI_HANDOVER.md` → 相關 ADR → 依任務讀 03/09/05/11/12
- 修正 00_CONTEXT_HANDOVER 的「Harness 文件未建完」過期描述,改為已完成並需維護一致性
- 對齊 08_AI_HANDOVER 的閱讀順序與 03/09、05/11 文件分工
- 新增 `tasks/done.md`,與 `.ai-manifest.json` 的 done 狀態對齊
- 文件一致性修正,無功能變更、無架構變更
- 修正 03_DATABASE.md / 05_CODING_RULES.md 狀態:兩者為現行可用概覽;作廢檔為 `-old-*_DEPRECATED.md`

## 2026-07-05 — V2.1(停車強化)
- 停車面板移除複製鈕,MAP CODE 26px 大字純顯示
- 新增 resolveParking():「停車同Pxxx」完整繼承(MAPCODE/停車費/停車備註;深度上限3;引用不存在→原文+console.warn)

## 2026-07-05 — V2(CMS 架構)⭐ 架構變更
- 資料層改為 7 張 Google Sheets(行程/Places/Restaurants/Shopping/Hotels/Expenses/TripConfig),表頭別名容錯解析
- 行程 7 欄制(新增 ID 欄),Pxxx/Rxxx 引用 + 名稱備援
- 卡片型別改由 Places.類型 明確驅動;渡輪卡簡化(末班船欄+官方時刻表連結,移除內建 206 班次)
- Restaurants 掛 Place 自動列出;Shopping 表驅動購物頁;分帳新增行前團費卡
- 每張表獨立快取與內建後備;同步徽章新增「部分更新」

## 2026-07-04 — V1(旅行助理化)
- 今天模式:下一站=第一個未打卡;自駕化(TripConfig 開關);型別卡片+快速動作列
- 停車卡(MAPCODE)、渡輪卡、購物模式(樓層摺疊/想逛/搜尋)、分帳儀表板(含日期)
- 修復:renderSplit 包裝造成的無限遞迴(改名 renderSplitCore)

## 2026-07-04 — PWA ⭐ 架構變更
- Netlify 託管(解決 file:// 沙盒);manifest+sw.js(Shell=SWR、資料=網路優先);可安裝 iPhone/Android/Desktop

## 2026-07-03~04 — 基礎版
- 試算表(發布CSV)→ 手機頁;三層防線(內建→快取→背景同步)
- WebView 相容:console polyfill、fetch clone 錯誤退回、吸頂容器合一(修重疊)
