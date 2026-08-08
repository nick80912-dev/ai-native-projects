# v89 Inline Proxy Badges Design

## Goal

讓消費卡與採買卡使用同一套代購辨識語法：品名後方同行顯示「幫 [姓名] 買」，並把「幫／買」縮小一級，降低它們與姓名 badge 的視覺競爭。

## Scope

- 個人帳的消費卡若 `isProxy` 為真，在品名後顯示代購標記。
- 移除消費卡下方既有的「代購 姓名」badge。
- 同一個消費卡 renderer 服務最近消費、完整紀錄及批次展開子項，因此三處一致套用。
- 批次父卡維持既有「N 項代購」摘要，不在父卡列姓名。
- 採買卡沿用現有多人與 `+N` 規則，只調整「幫／買」的字級。
- 不改明細頁、篩選、代購資料、Ledger record、Shopping allocation、同步或備份格式。

## Presentation

視覺順序固定為：

```text
品名　幫 [姓名] 買
```

- 品名維持 14px。
- 姓名 badge 維持 10.5px、coral 語意色與圓角。
- 「幫／買」使用共用 affix class，固定 9.5px，剛好比姓名小 1px。
- 消費卡與採買卡共用同一個 target-markup renderer，避免文案、escape、aria 或樣式分岔。
- 消費卡的品名區改為可換行的 flex title row；整組代購標記可在左欄內換行，但不得侵入右側金額或操作鈕。
- 空白 target 安全顯示「未指定」，與既有消費卡語意一致。

## Accessibility

- 視覺拆分的「幫」、姓名 badge、「買」皆設為 `aria-hidden="true"`。
- 外層提供完整 `aria-label="幫姓名買"`；多人採買仍使用既有完整人數語意。
- 不新增互動元素，卡片按鈕、操作選單、鍵盤與焦點行為不變。

## Testing

- Node：消費卡代購標記位於品名 title row，舊下方「代購 姓名」badge 不存在；一般、團體與其他 badges 不受影響。
- Node：消費卡與採買卡共用 renderer；姓名與 affix 均正確 escape，aria 保留完整句子。
- CSS：姓名 10.5px、「幫／買」9.5px。
- Playwright：320／375／390px，短／長品名及長姓名無水平 overflow，不與金額或操作鈕重疊；最近消費、完整紀錄、批次展開子項與採買卡呈現一致。

## Version and Delivery

- 本批使用 v89；`app-version.js` 與 `sw.js` 同步升版，`sw.js` 只改版本字串。
- 原訂 SW 更新提示雙版本順延為 v90／v91。
- 更新 release notes、changelog、current roadmap 與測試文件。
- 不改 `main`、不部署、不建立 tag；完整驗證後 push `dev`。
