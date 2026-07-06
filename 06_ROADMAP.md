# 06 路線圖

## ✅ 已完成
- 基礎版:試算表→手機頁、離線內建、三層防線、WebView 相容修正
- PWA:manifest+SW(SWR/網路優先)、Netlify 部署、可安裝
- V1:今天模式(下一站=第一個未打卡)、自駕化(移除Uber/大眾運輸)、型別卡片、停車卡MAPCODE、渡輪卡、購物模式(樓層/想逛/搜尋)、分帳儀表板
- V2 CMS 化:7 張工作表資料庫、ID 引用(Pxxx/Rxxx)、Restaurants 掛 Place、Shopping 表驅動購物頁、行前團費卡、TripConfig
- 停車強化:移除複製鈕+大字 MAPCODE、「停車同Pxxx」完整繼承(深度3防循環、P999容錯)

## 🔄 進行中 / 待 Bar 動作
- **V2 預覽版驗收**(Bar 手機確認 7 表同步)→ 說「打包」出正式部署包
- 試算表修正:Day2 回住宿 P012 → P002
- Day 3-6 行程與地點資料(Bar 更新試算表後自動生效)
- 購物模式使用回饋(初版雛型,待討論調整)

## 📋 下一步
- V2 正式部署(ZIP → Netlify,SW bump v3)
- Restaurants 待補欄位(R001 麵酒一照庵、R006 上野商店的評分/時間)

## 🔮 未來(不急)
- 12 月東京行程接入(新行程分頁+transport=transit)
- 新版本上線時畫面提示立即刷新(取代開兩次生效)
- 有新版資料自動提示(SW updatefound UI)
