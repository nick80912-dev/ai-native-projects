# 15 AI 執行規範(決策權限 · 指令效力 · 不確定性協議)

> 由 Bar 於 2026-07-09 核准;2026-11 起通用內容移至框架 `ai-native-framework@1.0.0` 的 `EXECUTION_RULES.md`。本檔只記本專案差異,節號保留以免舊引用失效。與憲章衝突時以憲章為準。

## 1. 對話指令效力
依框架 §1(保守預設:Bar 的對話指令預設為一般指令;明確覆寫須點名規範＋表明本次偏離;覆寫僅限當次)。
- 本專案的禁改清單 = `PROJECT_CONSTITUTION.md` §3;Tier 2/3 見 `14_FILE_TIERS_AND_GATE.md`。

## 2. 不確定性協議
依框架 §2(三分法;嚴禁自行擴大範圍)。發現鄰近問題記入 `tasks/backlog.md`。

## 3. 文件 vs 現實衝突協議
依框架 §3。資料規格類衝突以 `schema.js` 為權威。

## 4. 檔案操作權限
依框架 §4(含禁改清單硬停規則)。本專案差異:
- 新增檔案命名依 `10_FOLDER_STRUCTURE.md`／`11_CODING_CONVENTION.md`。
- 作廢文件優先改名為 `-old-*_DEPRECATED.md` 而非刪除。
- 技術基線為零相依;引入外部套件走五段提案。
- 調整資料庫 schema = Google Sheet 欄位／`schema.js` SCHEMA。
- 違規紀錄寫入 `07_CHANGELOG.md`。

## 5. 任務分級
依框架 `WORKFLOW.md` §2。本專案對應:
| 級別 | 本專案範圍 |
|---|---|
| **A 純資料** | 只動 Google Sheet 資料列(`12_DEV_WORKFLOW.md` 情境 A/B);確認 ID/Type 正確即可 |
| **B 顯示層小改** | 只動渲染/文案/CSS;QA 三情境 + `07_CHANGELOG.md` |
| **C 架構/資料/部署** | 涉及 schema、parser、資料流、新型別、Tier 2 檔案、ADR;完整十三步 + 14 的高風險確認 + 健康報告 |

## 6. 防過度自信機制
依框架 §5。本專案的外部行為 = Sheet 發布 CSV、Apps Script、Netlify、GitHub Pages、SW 快取,結論一律以實測為準。

## 7. 模型無關性
依框架 §6。`.ai-manifest.json` known_traps 中屬特定工具生態(如 web_fetch robots、claude-in-chrome、Drive 連接器限制)者標註「工具特定」;**環境陷阱(WebView/同名函式/CSV)一律適用**。

## 8. 動工前核准閘門(Approval Gate)
依框架 §7。本專案:Project Understanding Report 的閱讀順序見 `08_AI_HANDOVER.md`;Tier 2 四項確認依 14。動工前確認輸出中須明示已知悉框架 §4 禁改清單硬停規則。
