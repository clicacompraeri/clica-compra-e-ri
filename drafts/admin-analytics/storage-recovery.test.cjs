"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {startAnalyticsReadiness}=require("./analytics-mount.cjs");
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test("offline at boot retries safely and eventually restores analytics without restart",async()=>{
 let online=false,onFirstReadyCount=0;
 const jobs=[],calls=[];
 const monitor=startAnalyticsReadiness({
  report:async(days)=>{calls.push(days);if(!online)throw Error("DB not ready");return {simulation:false,days,metrics:{pageViews:0},daily:[]};},
  isRevoked:async()=>false
 },{
  retryMs:60000,healthyMs:300000,
  schedule:(callback,interval)=>{jobs.push({callback,interval});return {unref(){}};},
  onFirstReady:()=>{onFirstReadyCount++;}
 });
 assert.equal(monitor.isReady(),false);
 await settle();
 assert.equal(monitor.isReady(),false);
 assert.equal(jobs.at(-1).interval,60000);
 online=true;
 jobs.at(-1).callback();
 await settle();
 assert.equal(monitor.isReady(),true);
 assert.equal(jobs.at(-1).interval,300000);
 assert.equal(onFirstReadyCount,1);
 online=false;
 jobs.at(-1).callback();
 await settle();
 assert.equal(monitor.isReady(),false);
 assert.equal(jobs.at(-1).interval,60000);
 online=true;
 jobs.at(-1).callback();
 await settle();
 assert.equal(monitor.isReady(),true);
 assert.equal(onFirstReadyCount,1,"retention scheduler must run only once");
 assert.equal(calls.length,4);
});
test("broken revocation lookup keeps reports offline even when summaries work",async()=>{
 let readFail=true,callback;
 const monitor=startAnalyticsReadiness({
  report:async days=>({simulation:false,days,metrics:{},daily:[]}),
  isRevoked:async()=>{if(readFail)throw Error("revocation storage missing");return false;}
 },{
  retryMs:1000,healthyMs:3000,schedule:(next)=>{callback=next;return {unref(){}};}
 });
 await settle();
 assert.equal(monitor.isReady(),false);
 readFail=false;
 callback();
 await settle();
 assert.equal(monitor.isReady(),true);
});
