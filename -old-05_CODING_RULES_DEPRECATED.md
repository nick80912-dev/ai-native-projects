# ⛔ 05_CODING_RULES — DEPRECATED(已作廢,勿讀)

> **這份文件已作廢,請勿使用。**
> 本檔為 V2 早期的精簡程式規範,已被更完整的 `11_CODING_CONVENTION.md` 取代。
> 其中提到的 `rowsToObjects`(表頭別名解析)已重構為 Schema 驅動的 `parseTable`,描述已過時。
>
> ✅ **正確權威來源:**
> - 完整編碼規範 → `11_CODING_CONVENTION.md`
> - 最高規範與流程 → `PROJECT_CONSTITUTION.md`
> - 架構決策理由 → `adr/`(0001-0004)
>
> 原 `05_CODING_RULES.md`(fileId 1EcC9Y3s_-yq1VkkI3y41fl2HZwDK4ZFU)因 Drive 工具無法刪除或改名而保留,
> 內容已被 11 取代。未來 AI 讀到原檔時,請以本作廢通知為準,直接改讀 11。

---

## 為什麼作廢(重點差異,供追溯)
| 舊 05 的描述 | 目前實際(以 11 為準) |
|---|---|
| 解析走「rowsToObjects 表頭別名」 | 已重構為 Schema 驅動 `parseTable/parseKeyValue`(見 ADR 0001) |
| CONFIG 區塊存 URL/gid | 改由 `schema.js` 的 SCHEMA.pubBase + 各 sheet.gid 提供(SSoT) |
| 六條鐵律(精簡) | 11 擴充為分類規範:命名/Component/Parser/Renderer/Storage/Schema/Sheet命名/Commit,並含新卡片型別四步註冊、防錯六類日誌 |
| 未涵蓋 | 11 補上:AppLog 六類、healthCheck、Render Error try/catch 保護、新型別註冊 SOP |

> 一句話:**看 11_CODING_CONVENTION.md,不要看原 05。** 兩者共通的核心鐵律(不硬編碼、不重複邏輯、型別不猜、設定集中、個人狀態存 localStorage、同名函式改名陷阱)在 11 中都保留並強化。
