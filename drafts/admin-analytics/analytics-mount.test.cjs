"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {attachAnalyticsIfEnabled}=require("./analytics-mount.cjs");
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
