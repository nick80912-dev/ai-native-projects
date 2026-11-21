/* 2026-11-21 健檢第 1 項:升版工具 tools/bump-version.js 進 repo。
   每次都檢查「下一次升版需要改的地方都找得到目前版本」,避免像 2026-11 舊腳本那樣
   靜默漏改(文件的保留範圍停在 v200)。不寫任何檔案。 */
const assert=require('assert');
const tool=require('../tools/bump-version.js');
const version=tool.currentVersion();
const plan=tool.plan(version);
assert.deepStrictEqual(plan.problems,[],'the next forward bump finds every place it needs to change');
assert.strictEqual(plan.b,version+1);
assert.strictEqual(plan.drop,version-2,'only the newest three generations are kept');
console.log('bump-version tests passed');
