# Shopping Form Session Workflow／State Seam Design

> 日期：2026-08-09
> 狀態：Bar 已確認，可直接進入實作計畫
> Runtime 版本：不占用新版本；維持 v98

## Purpose

深化既有 `shopping-ui-state.js`，讓它成為 Shopping list selection 與 form session lifecycle 的同一個 UI workflow/state 權威。此切片只接管 `form`、`formSession`、`photoError` 的 session state 與 effect ordering；Shopping store、照片 repository、Buy-to-Ledger domain、資料格式、split payload 與 DOM renderer 都留在 production adapter。

目前 open／cancel／save／save-another／failure／photo completion 各自直接改寫 state，返回 list／card／detail、暫存照片清理、同步 focus 與 pending guard 的順序只能靠 caller 記憶。新 seam 必須讓這些不變量由正式 module interface 表達，並保留既有可見行為。

## Owned State

`createState(seed)` 在既有 list state 之外正規化下列欄位：

```js
{
  form: null | Object,          // opaque form payload
  formSession: null | {
    sessionId: String,
    mode: 'add' | 'edit',
    itemId: String,
    returnContext: String,
    returnScrollTop: Number,
    originalCategory: String,
    originalStopRef: String,
    originalPhotoId: String,
    temporaryPhotoIds: String[],
    savePending: Boolean,
    photoRequestId: String
  },
  photoError: String
}
```

`form` 與 session metadata 對 module 而言是 opaque data；module 只複製 container，不解讀欄位驗證、Shopping Item schema 或照片內容。`split` 不屬於 state ownership，只能透過 ordered `clear-split` effect 清除。

## Public Actions

- `open-form`：要求合法 `sessionId`、`mode`、form 與 session seed；先建立 session，再依序 clear split、mount、render、同步 focus。
- `replace-form`：以同一 session 的新 opaque form 取代目前 form，選擇性清除 photo error 並 render。
- `close-form`：pending 時 fail closed；清空 owned form state，unmount，依 session／item／cancelled 交由 adapter 還原 list、card 或 detail。
- `form-save-requested`：要求目前 session 與 request ID 相符且尚未 pending；設 `savePending` 並同步按鈕。
- `form-save-failed`：只接受相同 session/request completion；保留 form，清 pending，記錄 photo 或 general UI error 所需的 effect。
- `form-save-succeeded`：只接受相同 session/request completion。一般儲存會關閉 session並執行 Today/list/return effects；save-another 會換入 caller 提供的新 form/session seed，保留分類與站點、清空其他輸入，render 後在同一 dispatch 內同步 focus `shoppingName`。
- `photo-save-requested`：只接受目前 session；建立 `photoRequestId`、清 photo error，但不呼叫 repository。
- `photo-save-succeeded`／`photo-save-failed`：同時核對 `sessionId` 與 `photoRequestId`。stale completion 回傳 unchanged，不得污染已關閉或較新的表單。
- `remove-form-photo`：pending 時 fail closed；以 caller 提供的 next form 清空目前照片並 render。

所有 ID 由 runtime 建立；module 不讀 clock 或 random。

## Ordered Effects

Module 先 `writeState(next)`，再依序執行 effects。允許的 adapter effects 為：

- `clear-split`
- `mount-form`／`unmount-form`
- `render-form`
- `sync-form-pending`
- `focus-form`
- `restore-form-context`
- `render-today`／`render-list`
- `cleanup-photo-ids`
- `notify-form-result`

Adapter 可呼叫既有 DOM、Shopping store 與 photo cleanup helper，但 module 不得 import 或直接讀它們。effect payload 只帶必要的 opaque context、item 與 photo IDs。

## Characterization Seam

正式遷移前先鎖住：add/edit open、cancel、validation/store failure 保持 Sheet、save success 返回 list/card/detail、save-another 同步 focus、pending 阻擋 close／duplicate save、舊 photo Promise completion 不覆蓋新 session。正式 interface 測試取代已被完整涵蓋的 source-extraction／substring assertion；瀏覽器測試保留真實 DOM 與照片 adapter 邊界。

## Invariants

- 同一時間最多一個 form session 與一個 active photo request。
- 所有 async completion 必須同時匹配 session ID 與 request ID。
- validation、store、photo failure 不關閉表單，也不改動持久資料。
- save-another 的 focus 必須是 dispatch 內的同步 effect；Toast 不得搶焦點。
- 暫存照片清理由 caller 決定清單，module 只排序 effect。
- 既有 Shopping list tab／selection action 與 interface 不變。

## Explicit Non-goals

不改 Shopping store、IndexedDB photo repository、photo audit／repair、Buy-to-Ledger、Shopping Item schema、backup、split payload、detail renderer、DOM markup、文案、版面、App/SW version、Netlify 或 main。

## Deletion Test

若刪除此深化，open/cancel/save/save-another/error/photo completion 會重新各自維護 pending、stale guard、清理、返回與 focus ordering；至少四個 caller 必須重新知道同一組 lifecycle 規則，因此不是 pass-through module。
