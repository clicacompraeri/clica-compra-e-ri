"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createSupabaseAnalyticsStore}=require("./supabase-analytics-store.cjs");
test("adaptador privado não expõe credencial e chama RPC apenas no banco autorizado",async()=>{
 const sent=[],key="chave-ficticia-privada-com-32-caracteres";
 const fetchFn=async(url,req)=>{sent.push({url,req});return {ok:true,status:200,json:async()=>true};};
 const store=createSupabaseAnalyticsStore({baseUrl:"https://test-project.supabase.co",serviceRoleKey:key,fetchFn});
 const ok=await store.ingest({type:"page_view",source:"direct",product:"",store:"other",email:"NAO ENVIAR"});
 assert.equal(ok,true);
 assert.equal(sent.length,1);
 assert.match(sent[0].url,/\/rpc\/ccr_analytics_ingest$/);
 assert.equal(sent[0].req.headers.apikey,key);
 assert.equal(sent[0].req.headers.authorization,"Bearer "+key);
 assert.doesNotMatch(sent[0].req.body,/email|NAO ENVIAR/);
 assert.deepEqual(JSON.parse(sent[0].req.body),{p_event_type:"page_view",p_source:"direct",p_product:"",p_store:"other"});
 assert.throws(()=>createSupabaseAnalyticsStore({baseUrl:"http://inseguro.invalid",serviceRoleKey:key,fetchFn}));
 assert.rejects(()=>store.report(99),/Periodo invalido/);
});
test("revogacao persistente envia somente SHA-256 do token, nunca o token original",async()=>{
 const sent=[];
 const fetchFn=async(url,req)=>{sent.push({url,req});return {ok:true,status:url.includes("on_conflict")?204:200,json:async()=>[]};};
 const store=createSupabaseAnalyticsStore({baseUrl:"https://test-project.supabase.co",serviceRoleKey:"chave-ficticia-privada-com-32-caracteres",fetchFn});
 const future=Math.floor(Date.now()/1000)+1800,token=future+".nonce.signature";
 assert.equal(await store.revoke(token),true);
 assert.equal(await store.isRevoked(token),false);
 assert.equal(sent.length,2);
 assert.doesNotMatch(sent.map(x=>x.url+x.req.body).join(","),/\.nonce\.signature/);
 assert.match(sent[0].req.body,/token_sha256/);
});

test("chave moderna sb_secret usa apenas apikey, nunca Authorization bearer",async()=>{
 let sent;
 const store=createSupabaseAnalyticsStore({baseUrl:"https://test-project.supabase.co",serviceRoleKey:"sb_secret_abc123123123123123123123123123",fetchFn:async(url,opts)=>{sent=opts.headers;return {ok:true,status:200,json:async()=>true};}});
 await store.report(7);
 assert.ok(sent.apikey.startsWith("sb_secret_"));
 assert.equal(Object.hasOwn(sent,"authorization"),false);
 assert.throws(()=>createSupabaseAnalyticsStore({baseUrl:"https://test-project.supabase.co",serviceRoleKey:"sb_publishable_abc123123123123123123123123123",fetchFn:async()=>{}}),/Chave publica/);
});

test("revogacao trata retorno minimo HTTP 201 sem JSON, como PostgREST",async()=>{
 let requested=false;
 const store=createSupabaseAnalyticsStore({
  baseUrl:"https://test-project.supabase.co",
  serviceRoleKey:"chave-ficticia-privada-com-32-caracteres",
  fetchFn:async(url,opts)=>{
   requested=true;
   assert.match(opts.headers.Prefer,/return=minimal/);
   return {ok:true,status:201,json:async()=>{throw Error("201 Created has empty body");}};
  }
 });
 const future=Math.floor(Date.now()/1000)+1800;
 assert.equal(await store.revoke(future+".nonce.signature"),true);
 assert.equal(requested,true);
});
