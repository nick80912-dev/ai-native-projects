# ADR 0017 — 住宿停靠點以 HID 引用住宿主檔

> 狀態：Accepted（2026-08-11 由 Bar 核准）。

**Decision**：Places 的住宿型列是具有個別 PID、交通與導航脈絡的「住宿停靠點」，Hotels 的列是以 HID 識別的「住宿主檔」。Places 新增 `HID` 外鍵，形成多個住宿停靠點對一個住宿主檔的 N→1 關係；runtime 只依 exact HID 關聯，不依名稱、地址、日期或資料順序猜測，也不在找不到時退回第一間 Hotel。

**Context**：現行 P002／P013／P022／P031／P040 都代表 Guest House Life Field，但分別保存每日不同的抵達里程與時間，因此不能合併 PID。既有 `hotelOf()` 與天氣 resolver 以名稱 substring 比對 Hotels，且前者找不到時會取第一筆 Hotel；名稱異動或新增第二間住宿後可能失聯或誤掛。

**Alternatives Considered**：

- A. Places.HID 嚴格外鍵（採用）：保留五個 PID，全部引用 H001。
- B. HID 優先、名稱 fallback：rollout 較寬鬆，但永久保留脆弱關聯與兩套語意。
- C. Hotels 維護名稱 aliases：沒有穩定外鍵，增加字串維護成本。
- D. 合併為單一 PID：資料模型表面較簡單，但會失去每日不同交通脈絡，違反本專案的行程需求。

**Why This Decision**：PID 與 HID 識別不同事物。PID 是一次住宿停靠的路線脈絡，HID 是實體住宿資料；把關聯放在 Places 可自然表達多個停靠點共用一間住宿，也讓兩邊顯示名稱可獨立修改。嚴格外鍵與 atomic snapshot validation 能在資料進入 UI 前暴露缺漏，不讓 runtime 靜默猜錯。

**Expected Benefits**：住宿名稱變更不再破壞關聯；新增第二間住宿不會誤用第一筆；住宿資訊面板與天氣文字共用同一 resolver；資料錯誤會附 PID／HID 明確 fail closed。五個現有 PID、交通時間與導航行為全部保留。

**Trade-offs**：Google Sheet Places、Schema、BUILTIN 與 App cache generation 必須同批遷移。`HID` 對整表不能標成一般 required 欄位，必須由資料驗證依 `Type=住宿` 條件式要求；非住宿列誤填 HID 也必須阻擋。全域 CMS Schema 升 3.0，但 Ledger 21 欄 2.9 契約仍獨立維持。

**Future Impact**：

- 新增住宿停靠點時必須先有 Hotels.HID，再於 Places 填入同一 HID。
- 同一 HID 可被多個 PID 引用；不得以「重複住宿」為由自動合併 PID。
- Hotels 名稱只供顯示，任何新 resolver 都必須走 HID。
- 若未來需要住宿實體的更多跨表關聯，應延伸 HID，而不是重新使用名稱 matching。
- 本批只建立 Places→Hotels 關聯，不改行程 ID、Ledger、Shopping、Apps Script 或個人備份。
