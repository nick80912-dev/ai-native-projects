# Architecture Decision Records(ADR)

架構決策的永久紀錄。**任何 AI 在提出架構重構前必先讀本資料夾**,避免重複推翻既有設計或產生互相衝突的方案。

## 用途
- 記錄「為什麼這樣設計」,而非「怎麼設計」(後者看 docs/程式)。
- 影響整體架構的重大修改 → 必須新增或更新對應 ADR。
- 既有 ADR 決策未經 Bar 同意不得推翻。

## 固定格式(每份 ADR 七段)
Decision · Context · Alternatives Considered · Why This Decision · Expected Benefits · Trade-offs · Future Impact

## 索引
| 編號 | 標題 | 狀態 |
|---|---|---|
| 0001 | Schema First(schema.js 為唯一資料規格) | Accepted |
| 0002 | Data-Driven UI(卡片由資料型別驅動,禁猜測) | Accepted |
| 0003 | Google Sheet 作為 CMS | Accepted |
| 0004 | Renderer 架構(型別 → 卡片 → 面板) | Accepted |
| 0005 | Dev/Main Branch Strategy | Accepted |

新增 ADR:複製格式、編號遞增、更新本索引。
