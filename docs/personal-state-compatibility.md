# 個人狀態備份 v1–v8 相容策略

> 由 Bar 於 2026-07-30 核可(批次一 P3)。本檔是**契約定義**,不是說明文;與程式衝突時以 `index.html` 為準,但衝突本身即為缺陷,必須修到一致。
> 對應的可執行契約在 `tests/personal-state-restore-matrix.test.js` —— 該檔注入 `index.html` 的**真實** store 實作,斷言還原後 `localStorage` 的實際內容,不是只驗版本號被接受。改本檔而不改測試(或反之)一律視為交付缺陷。

## 為什麼需要這份文件

備份格式從 v1 演進到 v8 共八個版本,但相容規則一直只存在於 `validatePersonalStatePayload()` 與 `restorePersonalState()` 的少數幾行 `if` 裡。旅伴之間裝置版本不一致、換手機還原舊備份,都會踩到這些規則,而規則本身沒有任何文字定義 —— 出事時無從判斷「這是預期行為還是 bug」。

## 現行版本

| 項目 | 值 |
|---|---|
| 目前匯出版本 | `PERSONAL_STATE_VERSION = 8` |
| 可還原版本 | `PERSONAL_STATE_SUPPORTED_VERSIONS = [1,2,3,4,5,6,7,8]` |
| 格式標記 | `format: 'trip-personal-state'`(不符即拒絕) |

## 一、向後相容:v1–v8 還原到 v8 的行為

**原則:缺欄位補該版本當時的語意預設值;`version` 欄位是唯一權威,payload 夾帶的欄位若不屬於該版本一律忽略。**

| 版本 | 該版新增 | 還原時對缺失欄位的處置 |
|---|---|---|
| v1 | 打卡／想逛／成員／團體帳佇列 | `personalLedger` → `[]`;`ledgerCategories` → 預設類別;`ledgerPayMethods` → 預設支付方式 |
| v2 | 個人帳、自訂類別／支付方式 | `proxyTargets` → `[]` |
| v3 | 代購對象 | `shoppingItems` → `[]` |
| v4 | 採買清單(`qty` 自由文字、`buyFor` 單一對象) | 見下方「採買項目的欄位遷移」 |
| v5 | `completedAt`／`splitGroupId`／`ledgerLinks` | `done:true` 但缺 `completedAt` → **空字串,不編造完成時間** |
| v6 | 結構化數量 `quantity`／`unit`／`legacyQtyText` | 無 `quantity` 時由 `qty` 遷移,無法安全解析則保留為 `legacyQtyText` |
| v7 | `allocations[]` 逐人分配 | 無 `allocations` 時由 `buyFor`／`targets` 遷移成單筆;缺 `allocationId` 自動補發 |
| v8 | `themeId`／`shoppingUnits`／`travelNotes` | **v<8 一律保留裝置現值,不重設為預設值** |

### 三項 v8 新狀態的保留規則(最容易誤解的一條)

還原 v1–v7 的備份時,主題、採買單位與旅途紀錄**取自還原當下裝置上的值**,不是預設值、也不是清空:

```js
if(payload.version<8){
  payload.themeId=currentThemeId();
  payload.shoppingUnits=shoppingUnitStore.all();
  payload.travelNotes=travelNoteStore.all();
}
```

**理由**:舊備份不知道這三項的存在,若讓它「還原」成預設值,等於用一份不含該資訊的備份去清掉使用者現有的設定 —— 資訊從無到有,不該由缺乏該資訊的來源決定。

**推論(已由測試鎖住)**:手動在 v7 備份裡加上 `themeId` 也不會生效。版本號決定行為,不是欄位存在與否。

### 採買項目的欄位遷移

| 來源 | 結果 |
|---|---|
| `qty: '3 盒'` | `quantity: 3`、`unit: '盒'`、`legacyQtyText: ''` |
| `qty: '約 3～5 個'` | `quantity: null`、`unit: ''`、`legacyQtyText: '約 3～5 個'`(**不猜測數字**) |
| `buyFor: '媽媽'` | 單筆 allocation,`target: '媽媽'` |
| `targets: [...]` | 逐一展開成多筆 allocation |
| 皆無 | 單筆 allocation,`target: ''`(自己的) |
| item 級 `ledgerLinks` | 下放到該筆 allocation,**已記帳關聯不得遺失** |
| `category: '代購'` | 清為 `''`(該分類已於 v64 移除) |

## 二、向前相容:未來版本被舊 App 讀到

**裁定:拒絕,不忽略未知欄位。**

`isSupportedPersonalStateVersion()` 只接受 `[1..8]`。v9 或更高的 payload 會在 `restorePersonalState()` 的第一道驗證就被擋下,吐「個人狀態格式驗證失敗」,**裝置原狀態一字不動**。

**理由**:這是刻意選擇,不是疏漏。`index.html` 的版本註解已經寫明後果 —— 若舊版 App 把新格式當成相容而忽略未知欄位,還原時會靜默丟掉新欄位:**已記帳的採買項目會重新顯示成未記帳而重複入帳,數量也會整批消失**。寧可讓使用者看到明確的失敗訊息,也不要產生看似成功的錯誤資料。

**對旅伴裝置版本不一致的實際影響**:版本較舊的裝置無法還原較新裝置匯出的備份。這是預期行為 —— 處理方式是把舊裝置更新到同版,而不是放寬驗證。

**同版本的未知欄位**:v8 payload 夾帶額外欄位不影響還原,且該欄位不會被寫進 `localStorage`(`applyPersonalStatePayload()` 只寫白名單內的 key)。

## 三、採買單位的既有規則如何與還原互動

| 規則 | 還原時是否適用 | 說明 |
|---|---|---|
| 單位最多 **6 個字** | ✅ 適用 | `SHOPPING_UNIT_MAX_LENGTH = 6`。超過即整批還原失敗,訊息為「採買單位最多 6 個字」 |
| 單位不可重複 | ✅ 適用 | 訊息為「採買單位不可重複」 |
| 單位不可空白 | ✅ 適用 | 訊息為「採買單位不可空白」 |
| 「個」不可刪除 | ✅ 適用 | 備份裡沒有「個」時,還原後自動補回**清單最前面** |
| 單位**筆數**上限 | ❌ 不存在 | — |

> **釐清一個常見誤解**:6 是**字數**上限,不是**筆數**上限。程式中沒有任何限制單位筆數的邏輯(`normalizeShoppingUnitBackupOptions` 只做長度、空白與重複檢查)。設定頁輸入框的 `maxlength="6"` 與 placeholder「最多 6 個字」講的也是字數。

## 四、失敗語意:全有或全無

還原是**原子操作**。`applyPersonalStatePayload()` 先快照 12 個 key 的原值,任一 `setItem` 失敗即逐一回復並向上拋出;`restorePersonalState()` 的所有驗證都在寫入之前完成。

**任何一項驗證失敗 → 整批不還原,裝置維持原狀,不套用主題,只吐一則錯誤訊息。** 不存在「還原了一半」的狀態。

## 五、複驗紀錄(2026-07-30)

- **無安全還原斷點**:v1–v8 逐版本實測,全部可還原成功,無需犧牲任何版本。
- **不升 v9**:P3 原提案要升版納入 `trip_shopping_units`,複驗發現該欄位已於 SW v72 的 v8 納入(`personalStateJson()` 已含 `shoppingUnits`)。無新欄位卻升版,只會讓已發出的 v8 備份被 v8 裝置拒絕,憑空製造相容斷點。經 Bar 裁定維持 `PERSONAL_STATE_VERSION = 8`。
- **測試覆蓋缺口已補**:此前僅 v1／v2／v4／v8 有還原測試,v3／v5／v6／v7 完全沒有;且既有 `settings-backup-ux.test.js` 用簡化假 store,跑不到真正的遷移邏輯。新增的矩陣測試注入真實實作,並經對照驗證(破壞 `payload.version<8` 分支後測試確實失敗)。

## 未來新增備份欄位時

1. **必須升版**,並在 `PERSONAL_STATE_SUPPORTED_VERSIONS` 加入新版本。
2. 在 `validatePersonalStatePayload()` 為低版本定義該欄位的預設值 —— 「保留裝置現值」與「補空值」是兩種不同語意,依欄位性質選擇並寫入本檔表格。
3. 於 `tests/personal-state-restore-matrix.test.js` 補上新版本的代表性 payload 與斷言。
4. 同步更新本檔。**四項缺一即為交付缺陷。**
