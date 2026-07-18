# 父列第一站父子行程卡 Runtime 設計

## 背景

首頁父子行程卡目前只收集父列之後、`行程` 欄空白的列。父列即使已有時間、地點與 ID，也只被當成群組標題，不會成為第一站。

現行 `getChildStopCluster()` 另要求後續 child 至少兩筆，因此以下合法兩站群組不會成立：

```text
父列本身第一站 + 一筆後續空白行程列
```

Day 1 現在已出現此情境：

```text
17:30 血拚時間 / 永旺夢樂城岡山 / P001
19:30 行程空白 / 唐吉訶德岡山駅前店 / P048
```

現行 `clusterTimeRange()` 也優先讀取後續 child 的第一筆時間，因此父列第一站時間不會進入群組時間範圍。

## 目標

1. 父列具有地點或 ID 時，將父列完整資料作為第一個子站。
2. 父列第一站加上一個後續子站，合計兩站即可成立父子卡。
3. 父子卡時間範圍由第一站時間開始，最後一站有時間時顯示區間。
4. 父卡只負責群組顯示與展開／收合，不可導向行程頁。
5. 第一站與所有後續子站都可導向行程頁的精確原始卡片。
6. 第一站完成／跳過後群組仍保留，全部子站清除後才推進到下一個父行程。
7. 規則適用 Day 1–6，不使用 Day、PID、名稱或地點數量特例。

## 非目標

- 不修改 Google Sheet 資料或 ID。
- 不把距離、交通時間或地點名稱用作群組推論。
- 不改變一般非群組行程卡。
- 不改變父卡展開／收合文案。
- 不改變行程頁資訊面板、導航 URL 或購物樓層功能。
- 不重設既有打卡、略過或自動略過 localStorage。
- 不將 Day 1 P001/P048 寫成硬編碼例外。

## 群組辨識規則

對每個具有 `act` 的父列：

1. 從父列下一列開始收集連續 `act` 空白、且具有 `place` 或 `ref` 的列。
2. 遇到下一個具有 `act` 的列即停止。
3. 若父列本身具有 `place` 或 `ref`，父列成為第一站。
4. 若父列本身沒有 `place` 與 `ref`，維持既有行為，只使用後續 child。
5. 最終站數至少兩站才成立群組。

因此：

- 父列有地點／ID＋一個後續 child：成立。
- 父列有地點／ID＋多個後續 child：成立。
- 父列沒有地點／ID＋一個後續 child：不成立。
- 父列沒有地點／ID＋至少兩個後續 child：維持既有成立規則。
- 沒有後續 child：不成立。

## 群組控制與第一站分離

父列同時包含群組名稱與第一站資料。為避免完成第一站後整組被主流程視為完成，首頁下一站流程使用一個內部群組控制項。

### 原始第一站

父列原始 item 保持不變：

```js
{
  id: '10/18_4',
  time: '17:30',
  act: '血拚時間',
  place: '永旺夢樂城 岡山',
  ref: 'P001'
}
```

此 item 作為 `cluster.items[0]`，所以：

- 第一站時間直接是 `17:30`。
- 第一站完成／跳過使用原始 item ID。
- 第一站導向 `openTripItem(dayIndex, '10/18_4')`。
- 行程頁同一張卡片的 checkbox 與首頁第一站狀態一致。

### 內部群組控制項

首頁主 next-stop 清單不直接使用父列原始 ID，而使用只存在於 runtime 的 controller：

```js
{
  id: '10/18_4__cluster',
  sourceId: '10/18_4',
  time: '17:30',
  act: '血拚時間'
}
```

controller：

- 不出現在 Sheet 或行程頁。
- 不提供導航或點擊。
- 只控制整組是否仍為首頁下一站。
- 全部 cluster items 清除後才標記完成。
- 使用現有 `trip_next_stop_progress` 儲存，不建立新的 storage key。

這能讓第一站使用真實行程 ID，同時避免第一站完成後整組提前消失。

## Runtime 介面

新增或調整小型 helper：

```js
clusterControllerId(parent)
```

回傳穩定的 `${parent.id}__cluster`。

```js
clusterController(parent)
```

建立首頁 next-stop 專用 controller，保留父列時間與群組名稱，並以 `sourceId` 指回父列。

```js
clusterParentForPick(items,picked)
```

若 picked 是 controller，依 `sourceId` 找回原始父列；一般 item 原樣回傳。

```js
homeNextStopItems(items)
```

將可成立群組的父列替換成 controller；一般行程保持原 item。後續空白 `act` 列仍不進入主 next-stop 清單，而由 cluster child picker 管理。

`getChildStopCluster(items,parent)` 回傳：

```js
{
  parent: parent,
  controllerId: '10/18_4__cluster',
  items: [parent].concat(children)
}
```

父列沒有地點／ID時，`items` 仍只包含既有 children。

## 時間顯示

`clusterTimeRange(parent,items)` 使用：

- 第一個有時間的 cluster item 作為起點。
- 最後一個有時間的 cluster item 作為終點。
- 起點與終點不同時顯示 `起點 - 終點`。
- 只有一個有效時間時只顯示該時間。
- 所有站都沒有時間時不顯示時間範圍。

Day 1 顯示：

```text
17:30 - 19:30
```

展開後：

```text
17:30 永旺夢樂城岡山
19:30 唐吉訶德岡山駅前店
```

不推算或補造 Sheet 未提供的時間。

## 完成、略過與自動略過

- 第一站使用原始父列 ID 記錄完成／略過。
- 後續子站使用各自原始 ID。
- controller 使用 `${parent.id}__cluster`。
- `pickClusterChild()` 依 cluster items 的原始時間與 ID 選擇目前子站。
- `completeClusterParent()` 檢查所有 cluster items；全部 cleared 後標記 controller 完成。
- 主 next-stop 流程只在 controller 完成後推進到下一個具有 `act` 的行程。
- 第一站或後續子站的自動略過維持現行時間判定與 `autoSkip` 標記。
- 行程頁勾選第一站原始卡片，等同完成第一站，不等同完成整個群組。
- 復原第一站完成／跳過只復原第一站；若 controller 已因全組完成而結束，復原任一子站時必須重新開啟 controller。

## 導航與父卡互動

- 父卡標題及主內容不綁定 `openTripItem()`。
- `展開該區串點`／`收合該區串點` 是父卡唯一主要互動。
- 第一站與後續站的展開列皆使用其原始 item ID 導向行程頁。
- 首頁主要導航按鈕依目前子站的地點／餐廳解析。
- 已完成、略過或自動略過的子站在展開列表中仍可導向行程頁。

## 目前公開 Sheet 回歸群組

### Day 1

1. 血拚時間：P001 永旺夢樂城岡山 → P048 唐吉訶德岡山駅前店

### Day 2

2. 廣島市區走馬看花：P003 → P004 → P005 → P006
3. 宮島走馬看花：P008 → P009 → P010 → P011

### Day 3

4. 尾道散策：R008 → P014
5. 千光寺公園：P015 → P016 → P017 → P018
6. 尾道散策：P019 → P020

### Day 4

7. 觀光時間：P023 → P024 → P025 → P026
8. 步行天堂：P027 → P028 → P029 → P030

### Day 5

9. 倉敷美觀地區巡禮：P032 → P033 → P034 → P035 → P036 → P037
10. 血拚時間：P038 → P039

### Day 6

11. 岡山城巡禮：P041 → P042
12. 神社巡禮：P043 → P044

## 測試策略

### 群組抽取

- 父列有地點＋一個 child 時成立兩站群組。
- 父列第一站完整保留時間、地點、ref 與原始 ID。
- 父列沒有地點＋一個 child 時不成立。
- 父列沒有地點＋兩個 child 時維持既有成立規則。
- 遇到下一個 `act` 立即停止。

### Controller 與進度

- `homeNextStopItems()` 只將合法群組父列替換成 controller。
- controller ID 穩定且不與 Sheet item ID 衝突。
- 完成第一站後 controller 仍未完成，群組仍為下一站。
- 全部 cluster items cleared 後 controller 完成，主流程才前進。
- 復原任一子站會重新開啟已完成 controller。
- 一般非群組 item 的完成、略過與復原行為不變。

### 時間與顯示

- Day 1 時間範圍為 `17:30 - 19:30`。
- 第一站展開列顯示 `17:30`。
- 最後一站無時間時不製造結束時間。
- 父卡不可導航。
- 第一站 P001 導向原始 Day 1 行程卡。
- P048 導向原始 Day 1 P048 行程卡。

### 全資料稽核

使用目前公開行程 CSV 建立 fixture 或唯讀稽核，確認 Day 1–6 共 12 組符合規則，至少明確覆蓋上述所有 PID／RID 序列。

## 文件與待辦

- `tasks/backlog.md`：父子行程卡 runtime 修正完成後移出高優先 backlog。
- `tasks/done.md`：記錄通用規則與 Day 1–6 回歸完成。
- `04_UI_GUIDELINES.md`：補充父列第一站時間、導航與群組完成規則。
- `07_CHANGELOG.md`：記錄 Day 1 P001→P048 與通用 runtime 修正。

## 驗收條件

- Day 1 首頁顯示「血拚時間」兩站父子卡。
- 時間範圍為 `17:30 - 19:30`。
- 展開後第一站顯示 P001 與 17:30，第二站顯示 P048 與 19:30。
- 第一站與第二站皆可導向行程頁精確卡片。
- 完成第一站後父子卡仍存在並切換到 P048。
- 全部子站完成／略過後才進入住宿 check in。
- Day 2–6 既有 11 組群組不退化。
- 一般行程、打卡、略過、自動略過、復原與 localStorage 格式維持相容。
