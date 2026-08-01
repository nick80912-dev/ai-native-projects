/* 個人狀態備份 v1–v8 還原矩陣(2026-07-30 P3)
   ============================================================
   為什麼要有這個檔:備份格式歷經 v1 → v8 八次演進,但在此之前只有 v1／v2／v4／v8
   四個版本有還原測試,**v3／v5／v6／v7 完全沒有**。而 `settings-backup-ux.test.js`
   的 sandbox 用的是簡化的假 store(`shoppingListStore.normalize` 只做淺拷貝),
   跑不到真正的遷移邏輯 —— 那份測試驗的是 UX 流程,不是版本相容性。

   本檔刻意**注入 index.html 的真實實作**:真的 `createShoppingListStore`、
   真的 `createLedgerOptionStore`、真的 `normalizeShoppingItem` 與數量遷移,
   只對 DOM／Ledger 紀錄／診斷等範圍外相依做最小 stub。
   斷言的是「還原後 localStorage 的實際內容」,不是「版本號有沒有被接受」。

   相容策略的文字定義見 `docs/personal-state-compatibility.md`,兩者必須一致。
   ============================================================ */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

/* vm context 內建立的物件 prototype 與 Node realm 不同,比對前先轉成純值 */
function plain(value){ return JSON.parse(JSON.stringify(value)); }

/* ---- 由具名邊界切出 index.html 的真實實作 ---- */
function slice(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  assert(start >= 0, '找不到起始邊界:' + startMarker);
  const end = html.indexOf(endMarker, start);
  assert(end > start, '找不到結束邊界:' + endMarker);
  return html.slice(start, end);
}

const shoppingLinkSource = slice('var SHOPPING_LEDGER_LINK_VERSION=', 'var SHOPPING_UNIT_MAX_LENGTH=');
const shoppingSource = slice('var SHOPPING_UNIT_MAX_LENGTH=', 'function shoppingStopName(');
const optionStoreSource = slice('function normalizeLedgerOption(', 'function isTestLedgerRecord(');
const travelNoteSource = slice('var TRAVEL_NOTES_KEY=', '/* ================= SETTINGS 2.0 ================= */');
const personalStateSource = slice('function closeSettings()', 'function setLedgerTestMode(');

/* 真實實作的證據:抓到假 store 混進來時要立刻失敗 */
assert.match(shoppingSource, /function normalizeShoppingItem\(/, '注入的是真的採買正規化');
assert.match(shoppingSource, /function migrateShoppingQtyText\(/, '注入的是真的數量遷移');
assert.match(optionStoreSource, /function normalizeShoppingUnitBackupOptions\(|normalizeRestore/, '選項 store 具備還原專用正規化');
assert.match(personalStateSource, /function validatePersonalStatePayload\(/, '注入的是真的 payload 驗證');

const KEYS = {
  checks: 'trip_checks',
  wants: 'trip_shop_wants',
  member: 'trip_member',
  queue: 'trip_ledger_queue',
  personal: 'trip_personal_ledger',
  categories: 'trip_ledger_categories',
  payMethods: 'trip_ledger_pay_methods',
  proxy: 'trip_ledger_proxy_targets',
  shopping: 'trip_shopping_list',
  theme: 'trip_theme',
  units: 'trip_shopping_units',
  notes: 'trip_travel_notes',
};

/* 裝置在還原之前的既有狀態。v<8 的 payload 沒有主題／單位／旅途紀錄,
   契約是「保留裝置現有的三項」而不是重設為預設值 —— 下面每個版本都會驗這件事。 */
const DEVICE_THEME = 'mist';
const DEVICE_UNITS = ['個', '盒', '袋'];
const DEVICE_NOTE = {
  id: 'note-device', kind: 'issue', text: '裝置上原有的紀錄', status: 'pending',
  createdAt: '2026-07-29T08:00:00.000Z', updatedAt: '2026-07-29T08:00:00.000Z',
  view: 'shop', appVersion: 'v72', online: false, syncState: 'offline', healthSummary: [],
};

function createStorage() {
  const values = {
    [KEYS.checks]: JSON.stringify({ P000: true }),
    [KEYS.wants]: JSON.stringify({ S000: true }),
    [KEYS.member]: '黃柏',
    [KEYS.theme]: DEVICE_THEME,
    [KEYS.units]: JSON.stringify(DEVICE_UNITS),
    [KEYS.notes]: JSON.stringify([DEVICE_NOTE]),
  };
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
    setItem(key, value) { values[key] = String(value); },
    removeItem(key) { delete values[key]; },
  };
}

function createSandbox() {
  const storage = createStorage();
  const box = { value: '', focus() {}, select() {} };
  const toasts = [];
  const appliedThemes = [];
  const sandbox = {
    console, JSON, Date, Math, Promise, String, Number, Boolean, Array, Object, RegExp, Error,
    isFinite, parseInt, parseFloat, setTimeout, clearTimeout,
    localStorage: storage,
    navigator: { clipboard: { writeText() { return Promise.resolve(); } } },
    document: { getElementById(id) { return id === 'personalStateBox' ? box : null; } },
    crypto: { randomUUID() { return 'uuid-' + (sandbox.__uuid = (sandbox.__uuid || 0) + 1); } },
    /* ---- 範圍外相依的最小 stub ---- */
    AppLog: { repo() {}, data() {} },
    toast(message) { toasts.push(String(message)); },
    escapeHtml(value) { return String(value); },
    jsString(value) { return String(value); },
    confirm() { return true; },
    renderAll() {}, updateLedgerPendingStatus() {}, openDiagnostics() {},
    openPersonalStateCopyFallback() {}, closePersonalStateDialog() {}, closeSettings() {},
    applyTheme(themeId, options) { appliedThemes.push({ themeId, options }); },
    timestampDate(value) { return new Date(value); },
    appNow() { return new Date('2026-07-30T08:00:00.000Z'); },
    getCurrentMember() { return storage.getItem(KEYS.member) || ''; },
    memberIsAllowed(value) { return value === '黃柏'; },
    canonicalMemberName(name) { return String(name == null ? '' : name).replace(/　/g, ' ').replace(/\s+/g, ' ').trim(); },
    lsGet(key, fallback) { const v = storage.getItem(key); return v === null ? fallback : JSON.parse(v); },
    lsSet(key, value) { storage.setItem(key, JSON.stringify(value)); },
    ledgerRepository: { queuedRecords() { return []; }, flushQueue() { return Promise.resolve(); } },
    personalLedgerRepository: { all() { return []; } },
    normalizeLedgerRecord(record) { return record; },
    normalizePersonalLedgerRecord(record) { return Object.assign({ payMethod: '', isProxy: false, proxyTarget: '', batchId: '' }, record); },
    validateLedgerRecord() { return true; },
    currentThemeId() { return storage.getItem(KEYS.theme) || 'ocean'; },
    /* ---- 常數:與 index.html 一致 ---- */
    PERSONAL_STATE_VERSION: 8,
    PERSONAL_STATE_SUPPORTED_VERSIONS: [1, 2, 3, 4, 5, 6, 7, 8],
    isSupportedPersonalStateVersion(version) { return typeof version === 'number' && [1, 2, 3, 4, 5, 6, 7, 8].indexOf(version) >= 0; },
    THEME_IDS: ['ocean', 'ivory', 'wisteria', 'cedar', 'mist', 'tea'],
    SHOPPING_CATEGORIES: ['必買', '伴手禮', '生活用品', '其他'],
    DEFAULT_LEDGER_CATEGORIES: ['餐飲', '交通', '票券', '購物', '衣物', '美妝', '其他'],
    DEFAULT_LEDGER_PAY_METHODS: ['現金', '信用卡', '行動支付', 'Suica', '其他'],
    LEDGER_QUEUE_KEY: KEYS.queue, PERSONAL_LEDGER_KEY: KEYS.personal,
    LEDGER_CATEGORY_OPTIONS_KEY: KEYS.categories, LEDGER_PAY_METHOD_OPTIONS_KEY: KEYS.payMethods,
    LEDGER_PROXY_TARGETS_KEY: KEYS.proxy, SHOPPING_LIST_KEY: KEYS.shopping,
    THEME_STORAGE_KEY: KEYS.theme, SHOPPING_UNIT_OPTIONS_KEY: KEYS.units, TRAVEL_NOTES_KEY: KEYS.notes,
    __storage: storage, __box: box, __toasts: toasts, __themes: appliedThemes,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  /* 真實實作,順序即相依順序 */
  vm.runInContext(shoppingLinkSource, sandbox);
  vm.runInContext(shoppingSource, sandbox);
  vm.runInContext(optionStoreSource, sandbox);
  vm.runInContext(travelNoteSource, sandbox);
  /* store 實例:與 index.html 的建構參數逐字對齊 */
  vm.runInContext([
    "var ledgerCategoryStore=createLedgerOptionStore({storage:localStorage,key:LEDGER_CATEGORY_OPTIONS_KEY,defaults:DEFAULT_LEDGER_CATEGORIES,normalizeList:normalizeLedgerCategoryOptions});",
    "var ledgerPayMethodStore=createLedgerOptionStore({storage:localStorage,key:LEDGER_PAY_METHOD_OPTIONS_KEY,defaults:DEFAULT_LEDGER_PAY_METHODS});",
    "var shoppingUnitStore=createLedgerOptionStore({storage:localStorage,key:SHOPPING_UNIT_OPTIONS_KEY,defaults:SHOPPING_COMMON_UNITS,normalizeList:normalizeShoppingUnitOptions,normalizeRestore:normalizeShoppingUnitBackupOptions});",
    "var ledgerProxyTargetStore=createLedgerProxyTargetStore({storage:localStorage,key:LEDGER_PROXY_TARGETS_KEY});",
    "var shoppingListStore=createShoppingListStore({storage:localStorage,key:SHOPPING_LIST_KEY});",
  ].join('\n'), sandbox);
  vm.runInContext(personalStateSource, sandbox);
  sandbox.closePersonalStateDialog = function () {};
  sandbox.closeSettings = function () {};
  return sandbox;
}

function restore(payload) {
  const sandbox = createSandbox();
  sandbox.__box.value = JSON.stringify(payload);
  sandbox.restorePersonalState();
  /* trip_member 與 trip_theme 以原始字串存放,其餘為 JSON —— 與 applyPersonalStatePayload 一致 */
  const RAW_KEYS = [KEYS.member, KEYS.theme];
  const read = (key) => {
    const raw = sandbox.__storage.getItem(key);
    return raw === null ? null : (RAW_KEYS.includes(key) ? raw : JSON.parse(raw));
  };
  return { sandbox, read, toasts: sandbox.__toasts };
}

/* 每個版本的代表性 payload。刻意只帶「該版本當時真的存在的欄位」,
   不預先補上後續版本才有的欄位 —— 否則測不到缺欄位的預設值。 */
const BASE = { format: 'trip-personal-state', checks: { P001: true }, wants: { S001: true }, member: '黃柏', ledgerQueue: [] };
const PERSONAL_RECORD = {
  id: 'personal-1', time: '2026-07-18T08:00:00.000Z', member: '黃柏', category: '餐飲',
  detail: '早餐', amountJpy: 500, amountTwd: 105, note: '',
};

const payloads = {
  1: Object.assign({}, BASE, { version: 1 }),
  2: Object.assign({}, BASE, {
    version: 2, personalLedger: [PERSONAL_RECORD], ledgerCategories: ['交通'], ledgerPayMethods: ['Suica'],
  }),
  3: Object.assign({}, BASE, {
    version: 3, personalLedger: [PERSONAL_RECORD], ledgerCategories: ['交通'], ledgerPayMethods: ['Suica'],
    proxyTargets: ['媽媽'],
  }),
  4: Object.assign({}, BASE, {
    version: 4, personalLedger: [PERSONAL_RECORD], ledgerCategories: ['交通'], ledgerPayMethods: ['Suica'],
    proxyTargets: ['媽媽'],
    /* v4 的採買項目:qty 是自由文字,沒有 completedAt／splitGroupId／ledgerLinks */
    shoppingItems: [{ id: 'shopping-v4', name: '藥妝', category: '伴手禮', qty: '3 盒', buyFor: '媽媽', stopRef: '10/18_3', done: true, createdAt: '2026-07-23T09:00:00.000Z' }],
  }),
  5: Object.assign({}, BASE, {
    version: 5, personalLedger: [PERSONAL_RECORD], ledgerCategories: ['交通'], ledgerPayMethods: ['Suica'],
    proxyTargets: ['媽媽'],
    /* v5 起有 completedAt／splitGroupId／ledgerLinks,數量仍是 qty 文字 */
    shoppingItems: [{ id: 'shopping-v5', name: '白桃', category: '伴手禮', qty: '2 個', buyFor: '媽媽', stopRef: '', done: true, createdAt: '2026-07-24T09:00:00.000Z', completedAt: '2026-07-24T10:00:00.000Z', splitGroupId: 'split-1', ledgerLinks: [{ version: 1, track: 'personal', testMode: false, recordId: 'r-1', batchId: '', linkedAt: '2026-07-24T10:05:00.000Z', releasedAt: '' }] }],
  }),
  6: Object.assign({}, BASE, {
    version: 6, personalLedger: [PERSONAL_RECORD], ledgerCategories: ['交通'], ledgerPayMethods: ['Suica'],
    proxyTargets: ['媽媽'],
    /* v6 起數量結構化為 quantity／unit／legacyQtyText,尚無 allocations[] */
    shoppingItems: [{ id: 'shopping-v6', name: '毛巾', category: '生活用品', quantity: 4, unit: '條', legacyQtyText: '', buyFor: '阿姨', stopRef: '', done: false, createdAt: '2026-07-25T09:00:00.000Z', completedAt: '', splitGroupId: '', ledgerLinks: [] }],
  }),
  7: Object.assign({}, BASE, {
    version: 7, personalLedger: [PERSONAL_RECORD], ledgerCategories: ['交通'], ledgerPayMethods: ['Suica'],
    proxyTargets: ['媽媽'],
    /* v7 起改為 allocations[] 逐人分配 */
    shoppingItems: [{ id: 'shopping-v7', name: '餅乾', category: '伴手禮', unit: '盒', legacyQtyText: '', allocations: [{ allocationId: 'shopping-v7-allocation-1', target: '媽媽', quantity: 2, ledgerLinks: [] }, { allocationId: 'shopping-v7-allocation-2', target: '阿姨', quantity: 1, ledgerLinks: [] }], stopRef: '', done: false, createdAt: '2026-07-26T09:00:00.000Z', completedAt: '', splitGroupId: '' }],
  }),
  8: Object.assign({}, BASE, {
    version: 8, personalLedger: [PERSONAL_RECORD], ledgerCategories: ['交通'], ledgerPayMethods: ['Suica'],
    proxyTargets: ['媽媽'],
    shoppingItems: [{ id: 'shopping-v8', name: '茶葉', category: '伴手禮', unit: '包', legacyQtyText: '', allocations: [{ allocationId: 'shopping-v8-allocation-1', target: '', quantity: 3, ledgerLinks: [] }], stopRef: '', done: false, createdAt: '2026-07-27T09:00:00.000Z', completedAt: '', splitGroupId: '', photoId: 'shopping-photo-from-backup' }],
    /* v8 起 payload 自帶三項新狀態 */
    themeId: 'cedar',
    shoppingUnits: ['個', '罐'],
    travelNotes: [{ id: 'note-backup', kind: 'suggestion', text: '備份帶來的紀錄', status: 'resolved', createdAt: '2026-07-28T08:00:00.000Z', updatedAt: '2026-07-28T09:00:00.000Z', view: 'split', appVersion: 'v72', online: true, syncState: 'synced', healthSummary: [] }],
  }),
};

/* ============================================================
   共同契約:v1–v8 全部都必須還原成功
   ============================================================ */
for (const version of [1, 2, 3, 4, 5, 6, 7, 8]) {
  const { read, toasts } = restore(payloads[version]);
  assert.deepStrictEqual(toasts, ['個人狀態已還原'], 'v' + version + ' 必須還原成功且只吐一則成功訊息');
  assert.deepStrictEqual(read(KEYS.checks), { P001: true }, 'v' + version + ' 還原打卡狀態');
  assert.deepStrictEqual(read(KEYS.wants), { S001: true }, 'v' + version + ' 還原想逛狀態');
  assert.strictEqual(read(KEYS.member), '黃柏', 'v' + version + ' 還原成員身分');
  assert.ok(Array.isArray(read(KEYS.shopping)), 'v' + version + ' 採買清單一定是陣列');
  assert.ok(Array.isArray(read(KEYS.units)), 'v' + version + ' 採買單位一定是陣列');
  assert.ok(read(KEYS.units).includes('個'), 'v' + version + ' 還原後「個」一定在單位清單內');
}

/* ============================================================
   逐版本:缺失欄位的預設值
   ============================================================ */

/* v1 —— 只有打卡／想逛／成員／佇列。個人帳與自訂選項退回預設 */
{
  const { read } = restore(payloads[1]);
  assert.deepStrictEqual(read(KEYS.personal), [], 'v1 缺個人帳 → 空陣列');
  assert.deepStrictEqual(read(KEYS.categories), ['餐飲', '交通', '票券', '購物', '衣物', '美妝', '其他'], 'v1 缺類別 → 預設類別');
  assert.deepStrictEqual(read(KEYS.payMethods), ['現金', '信用卡', '行動支付', 'Suica', '其他'], 'v1 缺支付方式 → 預設支付方式');
  assert.deepStrictEqual(read(KEYS.proxy), [], 'v1 缺代購對象 → 空陣列');
  assert.deepStrictEqual(read(KEYS.shopping), [], 'v1 缺採買清單 → 空陣列');
}

/* v2 —— 有個人帳與自訂選項,還沒有代購對象 */
{
  const { read } = restore(payloads[2]);
  assert.strictEqual(read(KEYS.personal).length, 1, 'v2 還原個人帳');
  assert.deepStrictEqual(read(KEYS.categories), ['交通'], 'v2 的自訂類別照原樣還原,不被預設覆蓋');
  assert.deepStrictEqual(read(KEYS.proxy), [], 'v2 缺代購對象 → 空陣列');
  assert.deepStrictEqual(read(KEYS.shopping), [], 'v2 缺採買清單 → 空陣列');
}

/* v3 —— 有代購對象,還沒有採買清單 */
{
  const { read } = restore(payloads[3]);
  assert.deepStrictEqual(read(KEYS.proxy), ['媽媽'], 'v3 還原代購對象');
  assert.deepStrictEqual(read(KEYS.shopping), [], 'v3 缺採買清單 → 空陣列');
}

/* v4 —— 採買項目為自由文字 qty,須遷移成結構化數量;缺 v5 欄位補空值 */
{
  const { read } = restore(payloads[4]);
  const items = read(KEYS.shopping);
  assert.strictEqual(items.length, 1, 'v4 還原採買項目');
  const item = items[0];
  assert.strictEqual(item.id, 'shopping-v4');
  assert.strictEqual(item.unit, '盒', 'v4 的「3 盒」遷移出單位');
  assert.strictEqual(item.allocations.length, 1, 'v4 的 buyFor 遷移成單筆 allocation');
  assert.strictEqual(item.allocations[0].target, '媽媽', 'v4 的 buyFor 成為 allocation target');
  assert.strictEqual(item.allocations[0].quantity, 3, 'v4 的「3 盒」遷移出數量 3');
  assert.deepStrictEqual(item.allocations[0].ledgerLinks, [], 'v4 缺 ledgerLinks → 空陣列');
  assert.strictEqual(item.completedAt, '', 'v4 done 為 true 但缺 completedAt → 空字串,不編造完成時間');
  assert.strictEqual(item.splitGroupId, '', 'v4 缺 splitGroupId → 空字串');
  assert.strictEqual(item.legacyQtyText, '', 'v4 可安全解析的 qty 不留 legacy 文字');
}

/* v5 —— 有 completedAt／splitGroupId／ledgerLinks,數量仍為文字 */
{
  const { read } = restore(payloads[5]);
  const item = read(KEYS.shopping)[0];
  assert.strictEqual(item.completedAt, '2026-07-24T10:00:00.000Z', 'v5 的 completedAt 原樣保留');
  assert.strictEqual(item.splitGroupId, 'split-1', 'v5 的 splitGroupId 原樣保留');
  assert.strictEqual(item.allocations[0].quantity, 2, 'v5 的「2 個」遷移出數量');
  assert.strictEqual(item.unit, '個', 'v5 的「2 個」遷移出單位');
  assert.strictEqual(item.allocations[0].ledgerLinks.length, 1, 'v5 的 item 級 ledgerLinks 下放到 allocation');
  assert.strictEqual(item.allocations[0].ledgerLinks[0].recordId, 'r-1', '已記帳關聯不得在還原時遺失');
}

/* v6 —— 結構化數量,尚無 allocations[] */
{
  const { read } = restore(payloads[6]);
  const item = read(KEYS.shopping)[0];
  assert.strictEqual(item.unit, '條', 'v6 的結構化 unit 原樣保留');
  assert.strictEqual(item.allocations.length, 1, 'v6 的 buyFor 遷移成單筆 allocation');
  assert.strictEqual(item.allocations[0].target, '阿姨');
  assert.strictEqual(item.allocations[0].quantity, 4, 'v6 的 quantity 下放到 allocation');
  assert.ok(item.allocations[0].allocationId, 'v6 缺 allocationId → 自動補發');
}

/* v7 —— 已是 allocations[],逐人分配原樣保留 */
{
  const { read } = restore(payloads[7]);
  const item = read(KEYS.shopping)[0];
  assert.strictEqual(item.allocations.length, 2, 'v7 的兩筆分配都保留');
  assert.deepStrictEqual(item.allocations.map((a) => a.target), ['媽媽', '阿姨'], 'v7 的分配對象與順序不變');
  assert.deepStrictEqual(item.allocations.map((a) => a.quantity), [2, 1], 'v7 的逐人數量不變');
}

/* ============================================================
   v<8 的三項新狀態:保留裝置現有值,不重設也不清空
   ============================================================ */
for (const version of [1, 2, 3, 4, 5, 6, 7]) {
  const { read, sandbox } = restore(payloads[version]);
  assert.strictEqual(read(KEYS.theme), DEVICE_THEME, 'v' + version + ' 還原後保留裝置現有主題');
  assert.deepStrictEqual(read(KEYS.units), DEVICE_UNITS, 'v' + version + ' 還原後保留裝置現有採買單位');
  assert.strictEqual(read(KEYS.notes).length, 1, 'v' + version + ' 還原後保留裝置現有旅途紀錄');
  assert.strictEqual(read(KEYS.notes)[0].id, 'note-device', 'v' + version + ' 舊備份不得清掉旅途紀錄');
  /* vm context 內建立的物件其 prototype 不同於 Node realm,deepStrictEqual 會因此失敗;走 JSON 比對值 */
  assert.deepStrictEqual(plain(sandbox.__themes), [{ themeId: DEVICE_THEME, options: { persist: false } }],
    'v' + version + ' 套用的是裝置現有主題');
}

/* 低版本 payload 就算夾帶三項新欄位也一律忽略 —— 版本號才是權威,不是欄位存在與否。
   否則手改過的舊備份會繞過「保留裝置現值」的契約。 */
{
  const smuggled = Object.assign({}, payloads[7], {
    themeId: 'tea',
    shoppingUnits: ['個', '罐', '瓶'],
    travelNotes: [{ id: 'note-smuggled', kind: 'issue', text: '不該生效', status: 'pending', createdAt: '2026-07-28T08:00:00.000Z', updatedAt: '2026-07-28T08:00:00.000Z', view: 'shop', appVersion: 'v72', online: true, syncState: 'synced', healthSummary: [] }],
  });
  const { read } = restore(smuggled);
  assert.strictEqual(read(KEYS.theme), DEVICE_THEME, 'v7 夾帶的 themeId 不生效');
  assert.deepStrictEqual(read(KEYS.units), DEVICE_UNITS, 'v7 夾帶的 shoppingUnits 不生效');
  assert.strictEqual(read(KEYS.notes)[0].id, 'note-device', 'v7 夾帶的 travelNotes 不生效');
}

/* v8 —— 三項新狀態由 payload 覆蓋裝置現值 */
{
  const { read, sandbox } = restore(payloads[8]);
  assert.strictEqual(read(KEYS.theme), 'cedar', 'v8 的 themeId 覆蓋裝置現值');
  assert.deepStrictEqual(read(KEYS.units), ['個', '罐'], 'v8 的採買單位覆蓋裝置現值');
  assert.strictEqual(read(KEYS.notes).length, 1);
  assert.strictEqual(read(KEYS.notes)[0].id, 'note-backup', 'v8 的旅途紀錄覆蓋裝置現值');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(read(KEYS.shopping)[0], 'photoId'), false, 'v8 即使夾帶 photoId 也不得在另一台裝置建立無效附件引用');
  assert.deepStrictEqual(plain(sandbox.__themes), [{ themeId: 'cedar', options: { persist: false } }], 'v8 套用備份帶來的主題');
}

/* ============================================================
   採買單位的既有規則如何與還原互動
   ============================================================ */

/* 「個」不可刪除:備份裡沒有「個」時,還原後會被補回最前面 */
{
  const payload = Object.assign({}, payloads[8], { shoppingUnits: ['盒', '袋'] });
  const { read } = restore(payload);
  assert.deepStrictEqual(read(KEYS.units), ['個', '盒', '袋'], '缺「個」時補回清單最前面');
}

/* 單位是 6 個「字」的長度上限,不是 6 「筆」的數量上限 —— 還原不設筆數上限 */
{
  const many = ['個', '件', '盒', '包', '袋', '瓶', '罐', '組', '條', '雙'];
  const { read } = restore(Object.assign({}, payloads[8], { shoppingUnits: many }));
  assert.deepStrictEqual(read(KEYS.units), many, '還原不限制單位筆數(6 是字數上限)');
}
{
  const { toasts } = restore(Object.assign({}, payloads[8], { shoppingUnits: ['個', '這個單位超過六個字'] }));
  assert.notStrictEqual(toasts[0], '個人狀態已還原', '超過 6 個字的單位必須被拒絕');
  assert.match(toasts[0], /採買單位最多 6 個字/, '並且要說清楚是單位長度問題');
}
{
  const { toasts } = restore(Object.assign({}, payloads[8], { shoppingUnits: ['個', '盒', '盒'] }));
  assert.notStrictEqual(toasts[0], '個人狀態已還原', '重複單位必須被拒絕');
  assert.match(toasts[0], /採買單位不可重複/, '並且要說清楚是重複問題');
}

/* ============================================================
   向前相容:未來版本的 payload 一律拒絕(不是忽略未知欄位)
   ============================================================ */
{
  const { read, toasts } = restore(Object.assign({}, payloads[8], { version: 9 }));
  assert.deepStrictEqual(toasts, ['個人狀態格式驗證失敗'], 'v9 payload 必須被明確拒絕');
  assert.deepStrictEqual(read(KEYS.checks), { P000: true }, '拒絕時裝置原狀態一字不動');
  assert.strictEqual(read(KEYS.theme), DEVICE_THEME, '拒絕時不得套用任何主題');
}
{
  const { toasts } = restore(Object.assign({}, payloads[8], { version: 0 }));
  assert.deepStrictEqual(toasts, ['個人狀態格式驗證失敗'], 'v0 同樣被拒絕');
}
{
  const { toasts } = restore(Object.assign({}, payloads[8], { format: 'something-else' }));
  assert.deepStrictEqual(toasts, ['個人狀態格式驗證失敗'], '格式標記不符必須被拒絕');
}

/* v8 payload 帶未知欄位時仍可還原,且未知欄位不會被寫進 localStorage */
{
  const { read, toasts } = restore(Object.assign({}, payloads[8], { futureField: { anything: true } }));
  assert.deepStrictEqual(toasts, ['個人狀態已還原'], '同版本的未知欄位不影響還原');
  assert.strictEqual(read('futureField'), null, '未知欄位不得落地');
}

/* ============================================================
   無法安全還原時:整批失敗,不得留下半套狀態
   ============================================================ */
{
  const bad = Object.assign({}, payloads[8], { themeId: 'no-such-theme' });
  const { read, toasts } = restore(bad);
  assert.ok(toasts.length === 1 && toasts[0] !== '個人狀態已還原', '未知主題必須讓整批還原失敗');
  assert.deepStrictEqual(read(KEYS.checks), { P000: true }, '失敗時打卡狀態不得被改動');
  assert.strictEqual(read(KEYS.theme), DEVICE_THEME, '失敗時主題不得被改動');
}
{
  const bad = Object.assign({}, payloads[7], {
    shoppingItems: [{ id: 'broken', name: '', category: '', createdAt: '2026-07-26T09:00:00.000Z' }],
  });
  const { read, toasts } = restore(bad);
  assert.ok(toasts.length === 1 && toasts[0] !== '個人狀態已還原', '採買品名空白必須讓整批還原失敗');
  assert.deepStrictEqual(read(KEYS.checks), { P000: true }, '失敗時裝置狀態不得被改動');
}

console.log('personal state restore matrix (v1–v8) tests passed');
