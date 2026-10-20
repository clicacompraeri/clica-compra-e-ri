"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {buildDemoReport}=require("./dashboard-adapter.cjs");
test("relatorio de mais de 500 eventos preserva os totais",()=>{
 const at=new Date().toISOString();
 const rows=Array.from({length:501},()=>({type:"page_view",at,source:"direct"}));
 const result=buildDemoReport(rows);
 assert.equal(result.metrics.pageViews,501);
 assert.equal(result.daily.reduce((s,d)=>s+d.pageViews,0),501);
});
test("rejeita mais eventos que a capacidade do laboratorio",()=>{
 const at=new Date().toISOString();
 const rows=Array.from({length:10001},()=>({type:"page_view",at,source:"direct"}));
 assert.throws(()=>buildDemoReport(rows),/Limite de eventos/);
});
