"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const script=fs.readFileSync(path.join(__dirname,"analytics-client-candidate.js"),"utf8");
test("coleta permanece totalmente inativa sem habilitacao explicita",()=>{
 const sent=[],document={documentElement:{dataset:{}},addEventListener(){throw Error("Listener should be off");}};
 vm.runInNewContext(script,{document,navigator:{sendBeacon:(...args)=>sent.push(args)},location:{href:"https://site.example/",hostname:"site.example"},URL,Blob,fetch:()=>{throw Error("Should not fetch");}});
 assert.equal(sent.length,0);
});
test("coleta ficticia habilitada envia categoria e nao envia identidade ou URL",async()=>{
 const sent=[],listeners={};
 const document={
  documentElement:{dataset:{ccrAnalytics:"enabled"}},referrer:"",
  querySelector(){return null;},
  addEventListener(name,listener){listeners[name]=listener;}
 };
 const location={href:"https://site.example/?utm_source=facebook&email=nao-enviar",hostname:"site.example"};
 const navigator={globalPrivacyControl:false,doNotTrack:"0",sendBeacon:(url,blob)=>{sent.push({url,blob});return true;}};
 vm.runInNewContext(script,{document,navigator,location,URL,Blob,fetch:()=>{throw Error("Beacon should suffice");}});
 assert.ok(listeners.click);
 const anchor={
  href:"https://meli.la/1fJ5ov1",
  closest:()=>({querySelector:()=>({textContent:"Potes Hermeticos"})})
 };
 listeners.click({target:{closest:()=>anchor}});
 assert.equal(sent.length,2);
 const objects=await Promise.all(sent.map(async x=>JSON.parse(await x.blob.text())));
 assert.equal(objects[0].type,"page_view");
 assert.equal(objects[1].type,"affiliate_outbound");
 assert.equal(objects[1].store,"mercado_livre");
 assert.equal(objects[1].source,"facebook");
 assert.ok(objects.every(item=>!Object.hasOwn(item,"email")&&!Object.hasOwn(item,"url")&&!Object.hasOwn(item,"referrer")));
 assert.equal(sent[0].url,"/api/analytics/event");
});
