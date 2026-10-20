"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {buildDemoReport}=require("./dashboard-adapter.cjs");
const ev=(at)=>({type:"page_view",at:new Date(at).toISOString(),source:"direct"});
test("7 datas UTC: indicador coincide com soma das barras, mesmo no limite inicial",()=>{
 const firstDate=new Date();firstDate.setUTCHours(0,0,0,0);firstDate.setUTCDate(firstDate.getUTCDate()-6);
 const report=buildDemoReport([ev(firstDate.getTime()-1000),ev(firstDate.getTime()+1000)],{days:7});
 assert.equal(report.metrics.pageViews,1);
 assert.equal(report.daily.reduce((sum,d)=>sum+d.pageViews,0),1);
});
test("1 data UTC: indicador exclui evento do dia anterior",()=>{
 const today=new Date();today.setUTCHours(0,0,0,0);
 const report=buildDemoReport([ev(today.getTime()-1000),ev(today.getTime()+1000)],{days:1});
 assert.equal(report.metrics.pageViews,1);
 assert.equal(report.daily.reduce((sum,d)=>sum+d.pageViews,0),1);
});
