"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {attachAnalyticsIfEnabled,startAnalyticsRetention}=require("./analytics-mount.cjs");
test("flag desligada nao cria nenhuma rota administrativa nem coleta",()=>{
 let called=false;
 const app={use(){called=true;}};
 assert.equal(attachAnalyticsIfEnabled(app,{}),false);
 assert.equal(attachAnalyticsIfEnabled(app,{CCR_ANALYTICS_ENABLED:"false"}),false);
 assert.equal(called,false);
});
test("flag ligada sem segredos completos falha antes de criar rotas",()=>{
 let called=false;
 const app={use(){called=true;}};
 assert.throws(()=>attachAnalyticsIfEnabled(app,{CCR_ANALYTICS_ENABLED:"true"}),/Incomplete isolated analytics configuration/);
 assert.equal(called,false);
});

test("limpeza de analytics inicia e repete diariamente, sem impedir o servidor em caso de erro",async()=>{
 let scheduled,interval,unrefed=false,invocations=0;
 const schedule=(fn,ms)=>{scheduled=fn;interval=ms;return {unref(){unrefed=true;}}};
 const store={purge:async()=>{invocations++;if(invocations===1)throw Error("temporary db error");}};
 startAnalyticsRetention(store,{schedule});
 await new Promise(ok=>setImmediate(ok));
 assert.equal(interval,86400000);
 assert.equal(unrefed,true);
 assert.equal(invocations,1);
 await scheduled();
 assert.equal(invocations,2);
});
