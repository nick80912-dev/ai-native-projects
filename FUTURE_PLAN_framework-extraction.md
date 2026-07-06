# FUTURE PLAN — AI Native Framework 抽取計畫

> 狀態:**已規劃,待執行**。觸發條件:旅遊 App 完成完整一輪(V2 驗收 → 打包 → Netlify 部署 → 線上驗證)後執行。
> 由 Bar 批准(GitHub + 版本綁定);框架抽取排入 App 完成後。本文件為執行藍圖,接手 AI 照此落地。

## 目標
把治理規範從旅遊 App 抽出成獨立、版本化的 GitHub Repo(`ai-native-framework`),讓未來所有專案(旅遊 App、AI 英文教練、任何個人 App)共用同一套 AI Harness / Constitution / Workflow / ADR 格式 / Manifest 規格。旅遊 App 成為第一個「引用框架」的實例。

## 核心原則:L1/L2/L3 分層(抽取時做「通用 vs 特定」手術)
判準:**這條規則換到別的專案還成立嗎?** 成立→L1(進框架);不成立→L2(留專案)。
- **L1 框架層(通用,進 Repo)**:Constitution 骨架、13步流程、五段提案格式、六類日誌**機制**、健康檢查清單、ADR 七段格式、manifest schema、Coding Convention 的**原則**(SSoT/Data-Driven/單一職責/高內聚低耦合)。
- **L2 實例層(旅遊特定,留 App)**:gid/PlaceID/Type值/渡輪/停車繼承/WebView 陷阱(禁 AbortController 等)/schema.js 內容/09 對照表。
- **L3 綁定層**:各專案 manifest 宣告「遵循 framework@x.y.z」+ 差異覆寫。
> 關鍵手術:validator.js 目前「規格+實作」混一起。抽取時 `VALIDATOR_SPEC.md`(六類+healthCheck 要檢查什麼)進框架;`validator.js`(實作)留 App。英文教練用同規格寫自己的 validator。

## GitHub Repo 結構(ai-native-framework)
```
ai-native-framework/
├── README.md                 框架簡介 + 如何被專案引用
├── VERSION                    語意化版本 v1.0.0
├── CONSTITUTION.md            憲章骨架(無任何專案細節)
├── WORKFLOW.md                13步流程 + Release/Debug flow
├── CONVENTIONS.md             通用編碼原則(語言無關)
├── VALIDATOR_SPEC.md          六類日誌規格 + healthCheck 清單(規格非實作)
├── HEALTH_CHECK.md            專案健康檢查清單(9 項)
├── adr/
│   ├── TEMPLATE.md            七段 ADR 範本
│   └── README.md              ADR 使用說明
├── ai-manifest.schema.json    manifest 欄位規格(JSON Schema)
└── examples/
    └── japan-travel-app.md    第一個實例的摘要(供參考,非完整搬入)
```

## 版本綁定機制(Bar 已要求)
- 框架用語意化版本 `MAJOR.MINOR.PATCH`(v1.0.0 起)。
- 每個專案的 `.ai-manifest.json` 新增欄位:`"framework": "ai-native-framework@1.0.0"`。
- 框架升級不強迫舊專案跟進;專案要升版時,由 AI 比對兩版差異、提五段提案、Bar 核可後才 bump。
- 破壞相容的框架變更 → MAJOR+1,並在框架 CHANGELOG 標註 migration 指引。

## 執行步驟(App 完成後)
1. Bar 在 GitHub 建立空 repo `ai-native-framework`(私有或公開自訂),提供給 AI 協作方式(或 Bar 依 AI 產出的檔案自行 push;目前對話環境無 GitHub 寫入工具)。
2. AI 產出上述所有 L1 檔案內容(從現有 PROJECT_CONSTITUTION/12_DEV_WORKFLOW/11_CODING_CONVENTION/validator.js/adr 抽取改寫為通用版,移除所有旅遊字眼)。
3. 框架 repo 首版標記 v1.0.0。
4. 回旅遊 App:.ai-manifest.json 加 `"framework": "ai-native-framework@1.0.0"`;docs 內純通用文件改為「參見框架 vX,本專案僅記差異」,保留 L2 專案特定內容。
5. 驗證:模擬新 AI 只讀「框架 + 旅遊 App 的 L2/L3」能否完整接手。
6. (未來)開第二專案(AI 英文教練)時,直接引用框架 v1.0.0 驗證通用性。

## 注意
- 抽取屬架構層動作,執行前仍需 Bar 最終確認當下範圍(依憲章第 3 條)。
- 不在 App 未落地前動框架,以免第一個實例不完整、框架失去最佳參考範例。
- 若對話環境屆時有 GitHub 工具,可由 AI 直接建 repo 與 push;否則 AI 產檔、Bar 手動 push。
