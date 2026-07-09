# 06 路線圖

> **定位**:本檔是方向性文件(做什麼、順序為何),**不承載即時狀態**。
> 即時狀態唯一權威:`tasks/`(current/backlog/done);快照見 `13_PROJECT_STATUS.md`。

## ✅ 已完成(里程碑層級)
- 基礎版:試算表→手機頁、離線內建、三層防線、WebView 相容修正
- PWA:manifest+SW(SWR/網路優先)、Netlify 部署、可安裝
- V1:今天模式、自駕化、型別卡片、停車卡MAPCODE、渡輪卡、購物模式、分帳儀表板
- V2 CMS 化:7 張工作表資料庫、ID 引用(Pxxx/Rxxx)、Restaurants 掛 Place、Shopping 表驅動購物頁、行前團費卡、TripConfig
- 停車強化:大字 MAPCODE 純顯示、「停車同Pxxx」完整繼承
- 旅途中首頁 UX:下一站模式(完成/跳過/復原)、天氣摘要
- 行程資料:六天大方向內容已補完(2026-07-09),剩內容微調
- 治理層 v2:檔案風險分級(14)、AI 執行規範(15)、Ops Playbook(16)

## 📋 下一階段(順序)
1. Bar 手機驗收 GitHub 最新預覽版 → 內容/UI 微調(最小修改)
2. Bar 說「打包」→ V2 正式部署(依 `14_FILE_TIERS_AND_GATE.md` 高風險流程)
3. 部署包與 QA 腳本納入 repo 版控(見 tasks/backlog)

## 🔮 未來(不急)
- 12 月東京行程接入(新行程分頁+transport=transit)
- 新版本上線提示立即刷新(SW updatefound UI)
- AI Native Framework 抽取(見 `FUTURE_PLAN_framework-extraction.md`,App 落地後執行)
