# ⛔ old 05_CODING_RULES — DEPRECATED(已作廢,勿讀)

> **這份文件已作廢,請勿使用。**
> 本檔為 V2 早期的精簡程式規範,已被更完整的 `11_CODING_CONVENTION.md` 取代。
> 其中提到的 `rowsToObjects`(表頭別名解析)已重構為 Schema 驅動的 `parseTable`,描述已過時。
>
> ✅ **正確權威來源:**
> - 完整編碼規範 → `11_CODING_CONVENTION.md`
> - 最高規範與流程 → `PROJECT_CONSTITUTION.md`
> - 架構決策理由 → `adr/`(0001-0004)
>
> 本檔是舊版 05_CODING_RULES 的封存檔,已改名為 `-old-05_CODING_RULES_DEPRECATED.md`。
> 現行 `05_CODING_RULES.md` 已更新且可用;完整細節仍可搭配 `11_CODING_CONVENTION.md` 查核。

---

## 為什麼作廢(重點差異,供追溯)
| 舊 05 的描述 | 目前實際(以 11 為準) |
|---|---|
| 解析走「rowsToObjects 表頭別名」 | 已重構為 Schema 驅動 `parseTable/parseKeyValue`(見 ADR 0001) |
| CONFIG 區塊存 URL/gid | 改由 `schema.js` 的 SCHEMA.pubBase + 各 sheet.gid 提供(SSoT) |
| 六條鐵律(精簡) | 11 擴充為分類規範:命名/Component/Parser/Renderer/Storage/Schema/Sheet命名/Commit,並含新卡片型別四步註冊、防錯六類日誌 |
| 未涵蓋 | 11 補上:AppLog 六類、healthCheck、Render Error try/catch 保護、新型別註冊 SOP |

> 一句話:**不要看本 `-old-05_CODING_RULES_DEPRECATED.md`;現行概覽看 `05_CODING_RULES.md`,細節看 `11_CODING_CONVENTION.md`。**
