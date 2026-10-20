"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createDemoStore}=require("./demo-event-store.cjs");
test("registra eventos ficticios e agrega indicadores",()=>{
 const store=createDemoStore();
 assert.equal(store.add({type:"page_view",at:new Date().toISOString(),source:"google"}).accepted,true);
 assert.equal(store.add({type:"affiliate_outbound",at:new Date().toISOString(),store:"amazon",source:"facebook"}).accepted,true);
 assert.equal(store.add({type:"event_not_allowed",at:new Date().toISOString()}).accepted,false);
 const r=store.report();
 assert.equal(r.demo,true);
 assert.equal(r.events,2);
 assert.equal(r.totals.page_view,1);
 assert.equal(r.totals.affiliate_outbound,1);
 assert.equal(r.stores.amazon,1);
 store.clear();
 assert.equal(store.report().events,0);
});
test("mantem capacidade maxima de eventos na memoria",()=>{
 const store=createDemoStore({capacity:2});
 for(let i=0;i<5;i++)store.add({type:"page_view",at:new Date().toISOString(),source:"direct"});
 assert.equal(store.report().events,2);
});
