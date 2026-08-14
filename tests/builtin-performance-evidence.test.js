const assert=require('assert');
const fs=require('fs');
const path=require('path');

const evidencePath=path.resolve(__dirname,'../docs/qa/builtin-performance-v111.json');
assert(fs.existsSync(evidencePath),'committed raw BUILTIN performance evidence exists');
const evidence=JSON.parse(fs.readFileSync(evidencePath,'utf8'));

function median(values){
  const sorted=values.slice().sort((a,b)=>a-b);
  const middle=sorted.length/2;
  return sorted.length%2?sorted[Math.floor(middle)]:(sorted[middle-1]+sorted[middle])/2;
}

assert.strictEqual(evidence.thresholdPct,10,'approved regression threshold remains 10%');
['baseline','candidate'].forEach(label=>{
  const run=evidence[label];
  assert.match(run.commit,/^[0-9a-f]{40}$/i,label+' records an exact commit');
  assert.strictEqual(run.samples.length,10,label+' contains ten raw cold-boot samples');
  run.samples.forEach((sample,index)=>{
    assert(Number.isFinite(sample.dcl)&&Number.isFinite(sample.today),label+' sample '+index+' has numeric timings');
    assert.strictEqual(sample.blank,false,label+' sample '+index+' rendered Today');
    assert(sample.identity&&sample.identity.app&&sample.identity.html&&sample.identity.sw,label+' sample '+index+' records shell identity');
    assert.strictEqual(sample.identity.app,sample.identity.html,label+' sample '+index+' HTML/App identity agrees');
    assert.strictEqual(sample.identity.sw,sample.identity.app,label+' sample '+index+' SW/App identity agrees');
    if(sample.identity.asset)assert.strictEqual(sample.identity.asset,sample.identity.app,label+' sample '+index+' asset/App identity agrees');
    assert.strictEqual(sample.identity.htmlTimestamp,sample.identity.timestamp,label+' sample '+index+' HTML/asset timestamp agrees');
  });
});
assert(evidence.baseline.samples.every(sample=>sample.identity.mode==='inline'),'baseline is the approved inline snapshot');
assert(evidence.candidate.samples.every(sample=>sample.identity.mode==='asset'),'candidate is the generated asset snapshot');

const baselineMedian=median(evidence.baseline.samples.map(sample=>sample.today));
const candidateMedian=median(evidence.candidate.samples.map(sample=>sample.today));
const regressionPct=(candidateMedian-baselineMedian)/baselineMedian*100;
const baselineDclMedian=median(evidence.baseline.samples.map(sample=>sample.dcl));
const candidateDclMedian=median(evidence.candidate.samples.map(sample=>sample.dcl));
const dclRegressionPct=(candidateDclMedian-baselineDclMedian)/baselineDclMedian*100;
assert(regressionPct<=evidence.thresholdPct,'Today median regression '+regressionPct.toFixed(2)+'% exceeds '+evidence.thresholdPct+'%');
assert.strictEqual(evidence.result.baselineDclMedian,baselineDclMedian,'recorded baseline DCL median is mechanically reproducible');
assert.strictEqual(evidence.result.candidateDclMedian,candidateDclMedian,'recorded candidate DCL median is mechanically reproducible');
assert.strictEqual(evidence.result.dclRegressionPct,Number(dclRegressionPct.toFixed(2)),'recorded DCL regression percentage is mechanically reproducible');
assert.strictEqual(evidence.result.baselineTodayMedian,baselineMedian,'recorded baseline median is mechanically reproducible');
assert.strictEqual(evidence.result.candidateTodayMedian,candidateMedian,'recorded candidate median is mechanically reproducible');
assert.strictEqual(evidence.result.regressionPct,Number(regressionPct.toFixed(2)),'recorded regression percentage is mechanically reproducible');
assert.strictEqual(evidence.result.passes,regressionPct<=evidence.thresholdPct,'recorded pass/fail is mechanically reproducible');

console.log('BUILTIN performance evidence tests passed');
