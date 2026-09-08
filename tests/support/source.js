/* tests/support/source.js — 依「名稱」擷取 index.html 的宣告與函式(測試用)
   ============================================================
   為什麼要有這個檔:2026-08-01 之前,設定相關契約靠
     html.slice(indexOf('function openSettings('), indexOf('function mergedLedgerRecords()'))
   這種「位置相依」的 source slice 驗證。它有兩個實證過的問題:
     1. 新增一個 render function 到區間外,斷言會靜默通過而不是失敗;
     2. 它會誘導實作者為了讓舊 slice 涵蓋到新函式,刻意安排函式在檔案中的位置 ——
        契約應該由語意決定,不該由排版決定(v74 設計規格 §7.1 規則 3／4)。

   擷取器會跳過字串常值內的括號,因此 HTML 樣板字串裡的 { } [ ] 不會弄亂括號配對。
   ⚠️ 不處理正規表達式常值中的括號;若某天要擷取內含 regex 的函式,先擴充這裡再用。
   ============================================================ */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {swVersion}=require('./version');

const root = path.resolve(__dirname, '..', '..');

function readIndexHtml() {
  return fs.readFileSync(path.join(root, 'shell', swVersion(), 'index.html'), 'utf8');
}

function scanSkippingStrings(source, start, onChar) {
  let quote = '';
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') { i++; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') { quote = ch; continue; }
    const done = onChar(ch, i);
    if (done !== undefined) return done;
  }
  return undefined;
}

/* 擷取 `function <name>(...){ ... }` 的完整本體 */
function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, 'function not found in index.html: ' + name);
  const open = source.indexOf('{', start);
  assert(open > start, 'function body not found: ' + name);
  let depth = 0;
  const end = scanSkippingStrings(source, open, function (ch, i) {
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return i; }
  });
  assert(end !== undefined, 'unbalanced function body: ' + name);
  return source.slice(start, end + 1);
}

/* 擷取 `var <name>= ... ;`(含跨行的物件／陣列常值) */
function extractDeclaration(source, name) {
  const start = source.indexOf('var ' + name + '=');
  assert(start >= 0, 'declaration not found in index.html: ' + name);
  let depth = 0;
  const end = scanSkippingStrings(source, start, function (ch, i) {
    if (ch === '{' || ch === '[' || ch === '(') depth++;
    else if (ch === '}' || ch === ']' || ch === ')') depth--;
    else if (ch === ';' && depth === 0) return i;
  });
  assert(end !== undefined, 'unterminated declaration: ' + name);
  return source.slice(start, end + 1);
}

module.exports = { readIndexHtml, extractFunction, extractDeclaration };
