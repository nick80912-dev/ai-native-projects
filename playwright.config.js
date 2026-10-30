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
    /* v164：App 的行程與記帳時間依旅程時區（日本）。預設以「手機設在日本時間」執行（實際旅途的情況）；
       手機留在台灣時間另由 trip-time-zone-v164.spec.js 驗證。 */
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
