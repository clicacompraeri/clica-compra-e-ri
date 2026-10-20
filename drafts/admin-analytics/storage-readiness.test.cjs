"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {checkAnalyticsStorage}=require("./analytics-mount.cjs");
test("readiness check approves complete private report and revocation lookup",async()=>{
 let calls=0;
 const store={report:async(days)=>{assert.equal(days,1);calls++;return {simulation:false,days:1,metrics:{pageViews:0},daily:[]};},isRevoked:async(token)=>{assert.equal(token,"not-a-valid-session-token-storage-probe");calls++;return false;}};
 assert.equal(await checkAnalyticsStorage(store),true);
 assert.equal(calls,2);
});
test("readiness fails closed when SQL missing or invalid, never treats demo as live",async()=>{
 for(const report of [null,{simulation:true,days:1,metrics:{},daily:[]},{simulation:false,days:1,metrics:{}}]){
  await assert.rejects(checkAnalyticsStorage({report:async()=>report,isRevoked:async()=>false}));
 }
 await assert.rejects(checkAnalyticsStorage({report:async()=>{throw Error("SQL absent");},isRevoked:async()=>false}),/SQL absent/);
 await assert.rejects(checkAnalyticsStorage({report:async()=>({simulation:false,days:1,metrics:{},daily:[]}),isRevoked:async()=>{throw Error("table missing");}}),/table missing/);
});
