const {defineConfig}=require('@playwright/test');

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
    baseURL:'http://127.0.0.1:4173',
    viewport:{width:390,height:844},
    trace:'retain-on-failure',
    screenshot:'only-on-failure'
  },
  webServer:{
    command:'node tests/browser/support/static-server.js',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:!process.env.CI,
    timeout:10000
  }
});
