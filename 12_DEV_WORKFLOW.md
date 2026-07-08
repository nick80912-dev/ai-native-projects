# 12 開發流程(Dev Workflow)

> 常見任務的標準步驟鏈。所有任務都在 PROJECT_CONSTITUTION 的十三步流程框架下進行。

## Pre-Work Git Sync Gate(每次開工前)
```
git fetch origin --prune
        ↓
確認 HEAD / origin/main / working tree 狀態
        ↓
若本地乾淨但落後 origin/main → fast-forward 同步
        ↓
若 working tree 不乾淨 → 先盤點差異,判斷是否已在 origin/main
        ↓
版本乾淨且與 origin/main 一致後,才開始實作 / 打包 / push / 部署
```
- 此 Gate 是檢查與同步流程,不是無條件覆蓋流程。
- 只有在確認所有本地差異都已存在於 `origin/main`,或 Bar 明確同意後,才可使用 `reset --hard` / `clean` / `checkout`。
- 若本地有 GitHub 沒有的內容,必須先列出檔案與差異,由 Bar 決定保留、提交、備份或丟棄。
- 任何功能修改、部署包整理、Netlify 上傳或 push 前都必須先通過此 Gate。

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
```
列出可清理目標白名單(服務登記檔 / 專案暫存目錄 / 已知低風險 cache)
        ↓
定義過期條件(本地服務必須「已登記且過期」;低風險暫存必須超過 24 小時)
        ↓
先實作 dry-run:只列出將清理項目、原因、年齡與來源,不做刪除或 kill
        ↓
加入 log、自測與移除方式
        ↓
確認不會亂殺所有 node / python / chrome 行程
        ↓
設定每 6 小時執行一次
```
- 清理排程只允許處理已登記且過期的本地服務,以及超過 24 小時的低風險暫存。
- 禁止用廣泛 process name 直接終止所有 `node`、`python`、`chrome` 行程;若需停止服務,必須能對應到登記檔、PID、port、啟動時間與專案來源。
- dry-run 是必備功能,且應作為預設或第一步驗證模式。
- log 必須記錄時間、動作、目標、判斷理由與結果;自測必須覆蓋「未登記服務不清理」、「未過期不清理」、「超過 24 小時低風險暫存才清理」。
- 必須提供移除排程方式,讓 Bar 可安全停用清理工具。

## Release Flow(發布)
```
本地 QA 三情境過 → 交預覽版 HTML → Bar 手機驗收 → Bar 說「打包」
        ↓
組裝部署包(index.html 引 schema.js/validator.js;sw.js bump VERSION;
SHELL_ASSETS 補新檔) → Playwright 斷網回歸 → 產 ZIP
        ↓
Bar 拖進 Netlify Deploys → 驗證線上 → 更新 CHANGELOG
```

## Debug Flow(除錯)
```
看 console 的 [分類] 錯誤(Schema/Parser/Data/Repository/Render/Sync)→ 直接定位模組
        ↓
window.healthCheck() 檢資料一致性(重複ID/懸空引用/未註冊型別/資料缺席)
        ↓
最小修改 → QA 三情境 → 更新文件與 CHANGELOG
```

## 每次交付後:Project Health Check
輸出健康報告,檢查:重複程式碼 / 未使用檔案 / 未更新文件 / Schema 與 UI 不一致 / Renderer 未註冊 / Parser 未使用 / Dead Code / 違反 Convention / 違反 ADR。
