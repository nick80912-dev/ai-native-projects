'use strict';
/* v168（backlog #62）：沙盒測試用的旅程幣別。載入 trip-currency.js 與 App 原文的幣別 helper
   （tripLocalCurrencyCode 到 ledgerAmountInputAttrs），沙盒沒有 DB.cfg.currency 時就是日圓，
   行為與 v167 以前相同。不覆蓋沙盒自己準備的同名函式。 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const moduleSource=fs.readFileSync(path.join(__dirname,'..','..','trip-currency.js'),'utf8');

function currencyHelperSource(html){
  const start=html.indexOf('function tripLocalCurrencyCode(){');
  const end=html.indexOf('function convertLedgerAmounts(',start);
  if(start<0||end<0)throw new Error('currency helpers not found');
  return html.slice(start,end);
}

function defined(context,name){return vm.runInContext('typeof '+name,context)==='function';}

function installCurrency(context,html){
  if(vm.runInContext('typeof TripCurrency',context)==='undefined')vm.runInContext(moduleSource,context);
  const helpers=currencyHelperSource(html);
  const names=(helpers.match(/^function ([A-Za-z0-9_]+)\(/gm)||[]).map(line=>line.slice(9,line.indexOf('(')));
  if(names.some(name=>!defined(context,name)))vm.runInContext(helpers,context);
  if(!defined(context,'formatLedgerCurrencyAmount')){
    const start=html.indexOf('function formatLedgerCurrencyAmount(');
    vm.runInContext(html.slice(start,html.indexOf('\n',start)),context);
  }
  return context;
}

module.exports={installCurrency,currencyHelperSource};
