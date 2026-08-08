# Shop Want Stable Key Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 想逛標記改用以 `placeId` 為主的穩定 key，讓標記不再因購物地點的列舉順序改變而指到別家店。

**Architecture:** 新增唯一權威 helper `shopWantStoreKey()`，所有想逛 key 的建立、讀取、統計、切換一律走它。既有索引型 key 以一次性、冪等的轉換函式處理；備份格式升 v9，v1–v8 還原時對 `payload.wants` 執行同一套轉換。

**Tech Stack:** 靜態 HTML/CSS/ES5 JavaScript、Node assert 測試、Playwright Chromium。

## 基準

| 項目 | 值 |
|---|---|
| 起始 SHA | `e78fca5` |
| 分支 | `dev` |
| 候選版 | v81（`app-version.js` / `sw.js`）|
| 已正式發布版（`origin/main`）| v73 |
| `PERSONAL_STATE_VERSION` 現值 | 8 |

## 一、根因與全部索引型讀寫點

`toggleWant()` 存進 `trip_shop_wants` 的 key 是 `w_<mallIndex>_<floor>_<name>`，其中 `mallIndex` 是 `shopMalls()` 回傳陣列的**列舉索引**。該陣列依「行程出現順序 → 名稱」排序，因此新增／移除購物地點或行程改動都會位移索引。

**已在實際資料中發生**：BUILTIN 快照只有 P001、P007 兩個購物地點；目前線上表為 `0:P001 1:P048 2:P007 3:P038 4:P039`，P007 的索引已由 1 變 2。且 `無印良品` 同時存在於 P001 與 P039 的 1F —— 索引位移一格即造成標記在兩家不同店之間轉移。

全部索引型讀寫點（皆在 `index.html`）：

| 行 | 位置 | 用途 |
|---|---|---|
| 3993 | `wantTotal` | 篩選列「想逛」總數 |
| 4008 | 每個 mall 的 `wanted` | 想逛清單內容與 `wants` 篩選判斷 |
| 4015 | 搜尋結果的 store id | 搜尋命中列 |
| 4028 | 想逛清單展開內容 | 展開後的店家列 |
| 4044 | 樓層想逛數 `wc` | 樓層標題的 ⭐N |
| 4047 | 樓層店家列 | 一般店家列 |
| 3930 | `toggleWant()` | 寫入／刪除 |
| 3974 | `storeRow()` | 接收 id 並綁 onclick |

另有 `shopWantKey(place,index)`（3893）只負責**想逛清單展開狀態**（`shopWantListOpen`），與 store want key 無關，依裁定三改名為 `shopWantListStateKey()`。

## 二、新 stable key 格式

```js
function shopWantStoreKey(place, index, store)
```

```text
w2:p<encoded placeId>:<encoded floor>:<encoded store name>
```

- 以 `encodeURIComponent()` 逐段編碼。`:` 會被編成 `%3A`，因此分隔符不可能被店名切斷；`"`／`&`／`<` 亦被編碼。
- `placeId` 一律 `toUpperCase()` 後編碼，與 `shopMalls()` 的既有正規化一致。
- **穩定 fallback**：`place.placeId` 不存在時改用 `n<encoded place name>`；名稱也不存在時才退到 `i<index>`。實務上 `shopMalls()` 的兩個分支都會 `if(!pid) return;`，故 fallback 不可達，但仍須實作以免日後放寬過濾時靜默退回索引語意。
- 不得在任何呼叫點自行拼接字串；runtime 判斷某店是否想逛一律 `wants[shopWantStoreKey(place,index,store)]`。

> `'`、`!`、`*`、`(`、`)`、`~`、`-`、`.`、`_` 不會被 `encodeURIComponent` 編碼。這不影響碰撞或切割（分隔符 `:` 已被編碼）；`'` 進入 `onclick` 屬性時仍由呼叫點既有的 `.replace(/'/g,"\\'")` 處理，行為與現況相同。onclick 跳脫整理屬於 #5，本次不動。

## 三、舊資料轉換

```js
function migrateShopWantKeys(wants, malls)
// → { wants: {...}, migrated: <n>, dropped: <n>, changed: <bool> }
```

規則：

1. key 符合 `^w_<digits>_` 者視為舊格式；其餘（含 `w2:` 新格式與任何無法辨識的字串）**原樣保留**，不動、不計數。
2. 取出前綴後的剩餘字串 `R`。**不自行切割 `floor` 與 `name`**（兩者都可能含 `_`），改為對目前全部 mall 的每一家 store 重建 `store.floor + '_' + store.name` 與 `R` 比對，收集候選。
3. 候選恰好 1 個 → 轉為該候選的 stable key。
4. 候選 0 個或 >1 個 → **不猜測、不依目前 mall index 決定**，移除該 key 並計入 `dropped`。
5. 純函式、無副作用、冪等：第二次執行時已無舊格式 key，`migrated`／`dropped` 皆為 0、`changed` 為 `false`。

**模糊資料處理**：多候選（如 `1F_無印良品` 同時存在於 P001 與 P039）一律移除。寧可讓使用者重勾一筆，也不要把錯誤映射永久固定下來。

**執行時機與提示**：在 `renderShopResults()` 取得 `malls` 之後、計算 `wantTotal` 之前執行一次；`changed` 為真才寫回 localStorage。`dropped > 0` 時顯示一次：

```text
有 N 筆舊想逛標記無法安全對應，請重新勾選。
```

提示不重複的機制**不需要新的 localStorage key**：轉換會把舊格式 key 全部消化掉，第二次以後 `dropped` 必為 0，因此天然只出現一次。另加一個 module 層 guard 變數，避免同一次 render 週期內重複 toast。

## 四、個人備份升為 v9

`wants` 的識別語意改變，舊版 App 若把 v9 當 v8 讀會靜默載入它無法解讀的 key。依 `docs/personal-state-compatibility.md`「未來新增備份欄位時」四項要求同步處理。

```js
PERSONAL_STATE_VERSION = 9
PERSONAL_STATE_SUPPORTED_VERSIONS = [1,2,3,4,5,6,7,8,9]
```

- v1–v8 還原：在 `restorePersonalState()` 的驗證階段（寫入之前，保持全有或全無）對 `payload.wants` 執行 `migrateShopWantKeys()`。
- v9 還原：不轉換，payload 已是 stable key。
- v9 匯出：只輸出 stable key（本機經轉換後已無舊格式）。
- 其他個人狀態欄位一律不動。
- 舊版 App 的 `SUPPORTED` 仍為 `[1..8]`，會在第一道驗證擋下 v9 並吐「個人狀態格式驗證失敗」，裝置原狀態不動 —— 即既有向前相容裁定，不需額外程式碼。
- 同步更新 `docs/personal-state-compatibility.md`（現行版本表、v9 列、複驗紀錄）與 `tests/personal-state-restore-matrix.test.js`。

> 已查證 `PERSONAL_STATE_VERSION` 現值為 8，未被其他功能升到 9 以上，故 9 是下一個正確版本。

## 五、TDD 測試矩陣

先寫失敗測試再改 runtime。新增 `tests/shop-want-stable-key.test.js`，以 `tests/support/source.js` 的 `extractFunction`／`extractDeclaration` 注入真實實作。

> 擷取器只數 `{}` 且會跳過字串常值，故被擷取的函式內不得使用含大括號的正則字面值（例如 `{2,3}` 量詞）。

**穩定性**

- [ ] 在兩個購物地點之間插入新地點後，既有想逛標記仍屬於原 `placeId`。
- [ ] 重新排序 mall 後，想逛標記不移動。
- [ ] 同店名同樓層存在於兩個不同 `placeId` 時，兩者 key 不相等。
- [ ] 刪除其中一家的標記不影響另一家。
- [ ] 店名含 `_`／`'`／`"`／`&`／`<`／`:` 時，key 不碰撞也不被切斷。

**舊資料轉換**

- [ ] 唯一候選正確轉成 stable key。
- [ ] 多候選時不猜測，移除並計入 `dropped`。
- [ ] 無候選時不產生任何 stable key。
- [ ] 轉換後不殘留 `w_<index>_` 型 key。
- [ ] 重跑轉換結果完全相同且 `changed` 為 `false`。
- [ ] 無法轉換的提示只出現一次。
- [ ] 非 `w_` 開頭的既有 key（如 `S001`）原樣保留。

**備份**（擴充 `tests/personal-state-restore-matrix.test.js`）

- [ ] v9 匯出只含 stable key。
- [ ] v9 匯出 → 清除 → 還原，想逛標記位置正確。
- [ ] v8 備份還原會執行轉換。
- [ ] v8 中含模糊舊 key 時，不會錯誤映射到任一家。
- [ ] `checks`／`member`／`ledger`／`shoppingItems`／`theme` 等欄位完全不受影響。

**瀏覽器**（擴充既有 shop 相關 spec 或新增最小 spec）

- [ ] 實際點選店家後，該店的 stable key 出現在 `trip_shop_wants`，且不含 `w_<digits>_`。

## 六、回滾方式

本次為單一 commit，回滾即 `git revert <sha>`。

- Runtime：revert 後 key 產生器回到索引型，`trip_shop_wants` 內已轉換的 `w2:` key 不會被舊程式辨識，等同全部想逛標記消失（資料仍在，只是不再匹配）。使用者需重新勾選；**不會**造成錯誤映射。
- 備份：revert 後 `PERSONAL_STATE_VERSION` 回到 8，已匯出的 v9 備份將被拒絕還原（明確失敗，非靜默錯讀）。
- 因此回滾安全但有一次性代價；若已在裝置上使用一段時間，優先修正而非回滾。

## 七、版本策略

已查證：`origin/main` 為 **v73**（最後正式發布），`dev` 候選版為 **v81**，尚未正式發布。依裁定七第一款，本修正**併入 v81，不額外跳 SW 版本**。

- `app-version.js`、`sw.js` **不修改**（`sw.js` diff 應為完全空白）。
- `netlify.toml` 不修改。
- `APP_RELEASE_NOTES` 的 v81 條目與 `07_CHANGELOG.md` 的 v81 段落補上本次修正。

> **實測注意**：因 `sw.js` 位元組不變，已安裝 v81 的裝置不會偵測到 SW 更新。但 SW 對 App 外殼採 network-first，連網重新載入即可取得新的 `index.html`；純離線的裝置會續用快取中的舊 v81。

## 八、Commit 邊界

單一 commit：

```text
fix(shop): stabilize want keys by place id
```

不得混入 #2～#5：整份清單局部更新最佳化、搜尋分類與空狀態改善、debounce、store-row 無障礙改造、onclick 跳脫整理、其他購物頁重構。

## 九、完成驗證

```bash
set -e
for f in tests/*.test.js; do node "$f"; done
npm run test:browser
node tools/check-doc-titles.js
node tools/check-app-version.js
git diff --check
```

完成後停止，等待是否處理 #2＋#3 的指示。
