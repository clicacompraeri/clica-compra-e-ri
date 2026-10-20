"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {createDemoDashboard}=require("./build-dashboard.cjs");
test("HTML de demonstracao incorpora resumo simulado",()=>{
 const html=createDemoDashboard();
 assert.ok(html.includes("window.__demoReport="));
 assert.ok(html.includes('"simulation":true'));
 assert.ok(html.includes('"pageViews":2'));
 assert.ok(html.includes("Série diária e indicadores obtidos de eventos fictícios"));
});
