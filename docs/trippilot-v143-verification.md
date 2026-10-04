# TripPilot v143 本機交付驗證

2026-10-04，隔離 worktree `codex/personal-trip-lifecycle`，基準 `d04017f479eb75fd7904c76b04288f90da9acad6`（origin/dev）。本輪未授權 push／部署。範圍是個人帳獨立 JSON 下載、資料與版本的 ⓘ 說明 dialog，不含記序匯入。

## 實作及 TDD

- 缺 exporter 與缺說明按鈕的 RED 已觀察；新增白名單／唯讀／損壞拒絕 Node 測試及 browser 下載、空資料、modal、inactive、手機寬度測試後轉 GREEN。
- 完整 Node 初輪 4 個失敗：直接 Date 違反統一時鐘規則、VM 缺新 helper、舊警告字面、五版 rolling window 字面。修正時間來源、注入真實 helper 並更新新契約斷言，不刪除備份／版本降級守門。
- 截圖發現 modal 160 在設定 170 後面，雖 inert 導致 click／visible 斷言能過，實際繪製被遮住；補 z-order RED→GREEN，改為 settings token +10。
- 第二張截圖發現同 specificity 的後方全頁高度規則覆蓋 height:auto。補高度 RED（796px）→GREEN，提高 selector specificity；390×844 實際內容高度 212.8px、字級 12px。不以邏輯 visible 取代實際截圖。
- 獨立 reviewer 確認選填欄位未驗型別會輸出字串布林／巢狀 token／負優惠券。先補 RED，再逐欄驗 primitive、enum 及既有稅率／優惠券範圍；保留缺欄與 nullable taxRate，不改資料或重新計算。
- 補下載 API 失敗及時間模擬不輸出檔案／不改原帳。手機寬度測試包含 320／375／390 × 六主題。

## 獨立審查裁定

同一 read-only reviewer 針對原始候選及一輪修正覆核：兩項 Important 已解決，無 Critical／Important／Minor 殘留。未再派第二位 reviewer。接受下列保留判定，不默默擴張任務：

- 實體 PWA 存檔及閱讀器：真機待驗，不能由 Chromium 替代。
- 完整 QA：由執行者重新跑最終樹，不以 reviewer 的少量檢查代替。
- 記序匯入／去重／分類映射：後續任務，尚未完成。
- 原備份／封存實作：本輪只修改說明，不變帳務或格式。
- Generator 無 live fetch 歷史：此次實際以 runRefresh(write:true, now:舊 timestamp, fetchCsv:回傳舊 snapshot[key]) 產生。Ledger 由既有 generator 產生 header，沒有網路 fetch；新舊 CSV 與 timestamp 已獨立深度比對相同。

## 驗證狀態

最終樹重新驗證：Node **107/107** 測試檔、Chromium Playwright **243/243**（6.9 分鐘，0 retry）、四項 gate（doc-titles／app-version／doc-generation／runtime-assets）及 diff check 全過。新匯出／modal 六項 browser、斷網內建／同步／旅行日、SW 更新及混世代、六主題與三手機寬度回歸均納入此次 full run；非實體裝置認證。

兩次 browser runner 共用測試 server 時，先結束的 runner 關閉 server，導致同時跑的 targeted 規格 ERR_CONNECTION_REFUSED；已確認為測試執行方式問題。最終完整 run 單獨啟動 server，不更動 App 或測試服務生命週期。

## 限制與復原

v142、root v110 bridge、CMS／Ledger schema、備份 v9／封存 v1、OAuth、帳務計算不變。若日後發布需復原，採下一個未使用 generation forward bump，同步 worker／version／snapshot／headers，絕不覆寫舊版或刪 SW。

TP143-a～c 與既有待驗項目未代勾；目前只有本機自動化及截圖證據，非上線或實機認證。
