# 06 路線圖

> **定位**:本檔是方向性文件(做什麼、順序為何),**不承載即時狀態**。
> 即時狀態唯一權威:`tasks/`(current/backlog/done);逐版交付紀錄見 `07_CHANGELOG.md`。

## ✅ 已完成(里程碑層級)
- 基礎版:試算表→手機頁、離線內建、三層防線、WebView 相容修正
- PWA:manifest+SW(App Shell 依版本 generation 原子安裝、已安裝後 cache-first;非 Shell 的同源 GET 網路優先,見 ADR 0019)、Netlify 部署、可安裝
- V1:今天模式、自駕化、型別卡片、停車卡MAPCODE、渡輪卡、購物模式、分帳儀表板
- V2 CMS 化:7 張工作表資料庫、ID 引用(Pxxx/Rxxx)、Restaurants 掛 Place、Shopping 表驅動購物頁、行前團費卡、TripConfig
- 停車強化:大字 MAPCODE 純顯示、「停車同Pxxx」完整繼承
- 旅途中首頁 UX:下一站模式(完成/跳過/復原)、天氣摘要
- 行程資料:六天大方向內容已補完(2026-07-09),剩內容微調
- 治理層 v2:檔案風險分級(14)、AI 執行規範(15)、Ops Playbook(16)

## 📋 下一階段(順序)
> 原本列在這裡的三項(手機驗收預覽版、V2 正式部署、部署包與 QA 腳本納入 repo 版控)已於 2026-07 完成;之後的發布改走 `16_OPS_PLAYBOOK.md` §E Release Flow。
1. 岡山旅程(2026-10-18–10-23)期間只做必要修正,依 `16_OPS_PLAYBOOK.md` §A2 forward bump。
2. 回程後:依 `tasks/backlog.md` 與出發前稽核報告處理其餘項目。
3. 下一趟旅程:依 `docs/new-trip-handbook.md` 連接新的 Sheet(ADR 0021)。

## 🔮 未來(不急)
- AI Native Framework 抽取(見 `FUTURE_PLAN_framework-extraction.md`,App 落地後執行)
