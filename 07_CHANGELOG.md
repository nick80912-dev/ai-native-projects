# 07 版本紀錄

紀錄格式:日期 / 版本 / 重點。細節不展開,新變更往上加。

## 2026-07-08 — 備註條列顯示優化
- 新增備註顯示層格式化,將多行備註中的 `•`、數字、圈號與 `※` 自動顯示為較易閱讀的段落 / 條列 / 提醒樣式
- 套用於 Places、Restaurants、Hotels、行程卡片與購物地點備註;Shopping 店家短備註維持原本精簡顯示
- 移除備註卡片前方燈泡符號,降低多餘空白與卡片高度
- 僅調整 App 顯示層,未修改 `schema.js`、parser、Google Sheet Schema 或 CMS 欄位
- Breaking Change:無

## 2026-07-07 — 購物頁多地點預覽版
- 購物頁來源改以 `Places.Type=購物` 顯示本次行程購物地點,再掛上 `Shopping.PID` 店家資料
- 新增 `全部 / 想逛 / 各購物地點` 切換,沒有店家明細的購物地點也會顯示資訊與導航
- 將「樓層指南」文案放寬為「區域 / 樓層」,短期不改 schema、validator 或 Google Sheet 結構
- Breaking Change:無

## 2026-07-07 — 行程篩選與想逛清單收合實作
- 行程分頁新增 `顯示全部 / 隱藏已完成` 篩選,使用既有打卡狀態
- 購物分頁想逛清單改為摘要列可展開 / 收合,避免長清單推擠樓層指南
- 兩者皆使用記憶體 UI state,不改 schema、validator、Google Sheet 或資料流
- Breaking Change:無

## 2026-07-07 — 行程篩選與想逛清單收合實作計畫
- 新增 `docs/superpowers/plans/2026-07-07-trip-filter-shop-wants.md`
- 明確實作順序:先提案 1 行程隱藏已完成,再提案 2 想逛清單可收合
- 限定只改預覽 HTML 與 changelog,不改 schema、validator、Google Sheet 或資料流
- Breaking Change:無

## 2026-07-07 — 行程篩選與想逛清單收合設計規格
- 新增 `docs/superpowers/specs/2026-07-07-trip-filter-shop-wants-design.md`
- 提案 1 採兩段式 `顯示全部 / 隱藏已完成`,限定於行程分頁
- 提案 2 採想逛清單可收合,使用記憶體 UI state,不改 Shopping 資料結構
- Breaking Change:無

## 2026-07-07 — 天氣城市 fallback 實作
- 首頁天氣城市推算新增 resolved 飯店資料與同日鄰近站點 fallback
- `Guest House Life Field` 這類本身不含城市的下一站,可沿用同日合理城市顯示天氣
- 推算結果只供天氣 chip 使用,不影響導航、schema、Google Sheet 或 CMS
- Breaking Change:無

## 2026-07-07 — 天氣城市 fallback 實作計畫
- 新增 `docs/superpowers/plans/2026-07-07-weather-city-fallback.md`
- 將天氣城市推算 fallback 拆成 resolved 資料比對、同日鄰近站點 fallback、首頁天氣接線與驗證任務
- 本次僅新增實作計畫,尚未修改 App 功能
- Breaking Change:無

## 2026-07-07 — 天氣城市 fallback 設計規格
- 新增 `docs/superpowers/specs/2026-07-07-weather-city-fallback-design.md`
- 定義下一站無法直接判斷城市時,可依同日鄰近站點與當日主要城市保守推算天氣城市
- 限定推算結果只供天氣 chip 使用,不影響導航、schema、Google Sheet 或 CMS
- Breaking Change:無

## 2026-07-07 — 專案規畫進度同步
- 從 GitHub fast-forward 更新到最新 main,納入首頁下一站與天氣摘要相關提交
- 新增 `13_PROJECT_STATUS.md`,彙整目前階段、已完成、等待事項、下一步與風險
- 更新 `.ai-manifest.json` 與 `tasks/current.md` / `tasks/backlog.md` / `tasks/done.md`,讓規畫進度與 GitHub 最新狀態一致
- Breaking Change:無

## 2026-07-07 — 首頁下一站完成/跳過復原
- 完成或跳過下一站後,toast 新增「復原」操作
- 復原會還原該站完成/跳過與打卡狀態,降低旅途中誤觸風險
- Breaking Change:無

## 2026-07-07 — 首頁日期卡與天氣摘要 UI 微調
- 縮小首頁日期卡高度與日期字級,減少上方留白
- 微放大天氣摘要 chip,讓右側資訊更穩定
- Breaking Change:無

## 2026-07-07 — 首頁天氣摘要 UX 實作
- 日期卡右側新增下一站所在地天氣摘要,格式為 `地名 圖示 溫度 雨%`
- 天氣地點依下一站資料推估,不使用 GPS
- 天氣資料即時抓取並快取於 localStorage,失敗時不影響首頁
- Breaking Change:無

## 2026-07-07 — 首頁天氣摘要實作計畫
- 新增 `docs/superpowers/plans/2026-07-07-home-weather-summary.md`
- 將天氣摘要拆成地點推估、天氣抓取/快取、日期卡 UI 與驗收任務
- 本次僅新增實作計畫,尚未修改 App 功能
- Breaking Change:無

## 2026-07-07 — 首頁天氣摘要設計規格
- 新增 `docs/superpowers/specs/2026-07-07-home-weather-summary-design.md`
- 定義日期卡右側顯示下一站所在地天氣摘要
- 明確限制不使用 GPS、不改 schema、不改 Google Sheet、不回寫 CMS
- Breaking Change:無

## 2026-07-07 — 首頁下一站模式 UX 實作
- 首頁改為只突出下一站的票卡式旅途中視圖
- 新增每個行程日獨立保存的完成 / 跳過狀態,僅存在 localStorage,不回寫 CMS
- 下一站判斷採完成 / 跳過優先,無紀錄時再依目前時間推估
- Breaking Change:無

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
