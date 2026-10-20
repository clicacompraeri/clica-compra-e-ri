"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createAdminToken}=require("./admin-auth.cjs");
const {createSessionRegistry}=require("./session-registry.cjs");
test("revoga token apos logout e preserva outra sessao",()=>{
 let now=Date.UTC(2026,9,19);
 const secret="chave-ficticia-com-mais-de-32-caracteres-2026";
 const registry=createSessionRegistry({now:()=>now});
 const first=createAdminToken(secret,now);
 const second=createAdminToken(secret,now);
 assert.equal(registry.isActive(first,secret),true);
 assert.equal(registry.revoke(first,secret),true);
 assert.equal(registry.isActive(first,secret),false);
 assert.equal(registry.isActive(second,secret),true);
 now+=31*60*1000;
 assert.equal(registry.isActive(second,secret),false);
});
