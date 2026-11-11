# 12 開發流程(Dev Workflow)

> 通用流程(開工 Gate、A/B/C 任務分級、十三步、Release／Debug flow)依框架 `ai-native-framework@1.0.0` 的 `WORKFLOW.md`;本檔只記本專案的情境步驟鏈與差異。本專案任務分級見 `15_AI_EXECUTION_RULES.md` §5;涉及 Tier 2 高風險檔案時,疊加 `14_FILE_TIERS_AND_GATE.md` 的確認程序。

## Pre-Work Git Sync Gate(每次開工前)
依框架 `WORKFLOW.md` §1。本專案基準分支 = `origin/dev`;任何功能修改、部署包整理或 push 前都必須先通過此 Gate。

## 情境 A:新增一個景點/餐廳/店家(純資料)
```
Google Sheet 加一列(填對應欄位與 ID)
        ↓
(若為新地點)確認 Type 欄填對 → App 自動套用卡片
        ↓
完成。不需改任何程式
```
- 餐廳掛 PID → 該地點卡自動列出;店家掛 PID → 該商場購物頁自動出現。

## 情境 B:新增一個 Shopping Mall
```
Places 表加一列(Type=購物,填 MAPCODE/停車/營業時間/官網)
        ↓
Shopping 表加該商場所有店家(PID 指向新商場,填樓層/分類)
        ↓
行程總表在對應時段的 ID 欄填新商場 PID
        ↓
完成。購物頁自動出現新商場與樓層摺疊
```

## 情境 C:新增一個 Places 欄位
```
Google Sheet Places 表加欄
        ↓
schema.js → sheets.places.columns 加一筆 { field, header, aliases?, required?, desc }
        ↓
(要顯示才做)infoPanel 等 renderer 加一行 kvRow('標籤', p.新field)
        ↓
重新產生 09_SCHEMA_MAPPING(schemaDoc())
        ↓
完成。Parser 完全不用改
```

## 情境 D:新增一張工作表
```
Google Sheet 建新分頁 → 發布為 CSV 取得 gid
        ↓
schema.js → sheets 加一組 { gid, label, kind, columns/keys/layout }
        ↓
buildDB 加一行 parseTable(RAW.新key, '新key')(依 kind)
        ↓
(要用到才做)renderer/repository 加對應查詢與顯示
        ↓
更新 .ai-manifest.json 的 sheets、02/03 文件、CHANGELOG
        ↓
完成
```

## 情境 E:新增一種卡片型別
```
schema.js → places.columns 的 type.values 加「新型別值:代號」
        ↓
typeTag 加分支回傳標籤;infoPanel 加該型別的顯示分支
        ↓
(選)寫獨立面板函式 + qa-btn 觸發
        ↓
healthCheck 確認無「未註冊型別」警告
        ↓
更新 ADR 0002/0004(若屬架構層)、CHANGELOG
```

## 情境 F:建立本機開發環境清理排程
> 詳細安全規範已移至 `16_OPS_PLAYBOOK.md` §B。重點:先建立**服務登記檔**(未登記一律不清)、dry-run 為第一步、白名單策略、log/自測/移除方式齊備、每 6 小時一次;禁以廣泛 process name 終止行程。

## Release Flow(發布)
依框架 `WORKFLOW.md` §5。本專案:`dev` → PR(dev → main)→ Bar Review / Merge → Netlify Production Deploy → 線上核對;細節(版本 bump、tag、回滾)見 `16_OPS_PLAYBOOK.md` §E／§F5／§A。
- 日常 Push 只進入 `dev`(自動發布 GitHub Pages 供驗收),不代表正式部署。
- 未經 Bar 核准,不得 Push 或 Merge 至 `main`。

## Debug Flow(除錯)
依框架 `WORKFLOW.md` §6。本專案:console 的 `[分類]` 錯誤來自 `validator.js` 的 `AppLog`;資料一致性跑 `window.healthCheck()`;修完跑 QA 三情境(斷網內建 / 連網同步 / 旅行日 mock Date)。

## 每次交付後:Project Health Check
依框架 `HEALTH_CHECK.md`(九項),另附 `tools/check-*.js` 與 `tests/` 結果。
