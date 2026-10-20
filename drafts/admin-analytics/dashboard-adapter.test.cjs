"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {buildDemoReport,syntheticEvents}=require("./dashboard-adapter.cjs");
test("gera relatorio apenas com eventos simulados",()=>{
 const rows=syntheticEvents();
 const report=buildDemoReport(rows,{days:7});
 assert.equal(report.simulation,true);
 assert.equal(report.accepted,49);
 assert.equal(report.rejected,0);
 assert.equal(report.metrics.pageViews,14);
 assert.equal(report.metrics.productViews,14);
 assert.equal(report.metrics.outboundClicks,14);
 assert.equal(report.metrics.courseCheckoutClicks,7);
 assert.equal(report.stores.length,2);
 assert.ok(report.sources.length>0);
});
test("rejeita evento desconhecido e nao coleta dados reais",()=>{
 const report=buildDemoReport([{type:"invalid",at:new Date().toISOString()}]);
 assert.equal(report.rejected,1);
 assert.equal(report.metrics.pageViews,0);
});
