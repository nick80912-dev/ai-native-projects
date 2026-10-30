const {defineConfig}=require('@playwright/test');
const port=Number(process.env.PORT)||4173;

module.exports=defineConfig({
  testDir:'./tests/browser',
  testMatch:'**/*.spec.js',
  fullyParallel:false,
  workers:1,
  retries:0,
  timeout:30000,
  expect:{timeout:5000},
  reporter:'list',
  use:{
    baseURL:'http://127.0.0.1:'+port,
    /* App 的行程與記帳時間跟手機時區走（v165，Bar 2026-10-30）。預設以「手機設在日本時間」執行，
       也就是這趟旅途的實際情況，測試時間才不會隨 CI runner（UTC）偏 9 小時；
       手機設在其他時區的情況由 phone-time-zone-v165.spec.js 驗證。 */
    timezoneId:'Asia/Tokyo',
    viewport:{width:390,height:844},
    trace:'retain-on-failure',
    screenshot:'only-on-failure'
  },
  webServer:{
    command:'node tests/browser/support/static-server.js',
    url:'http://127.0.0.1:'+port,
    reuseExistingServer:!process.env.CI,
    timeout:10000
  }
});
