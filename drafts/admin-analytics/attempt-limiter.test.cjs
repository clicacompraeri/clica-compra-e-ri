"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {createAttemptLimiter}=require("./attempt-limiter.cjs");
test("bloqueia apos cinco falhas, libera apos intervalo",()=>{
 let clock=100000;
 const limiter=createAttemptLimiter({now:()=>clock});
 for(let i=0;i<5;i++) {assert.equal(limiter.check("admin").allowed,true);limiter.fail("admin");}
 assert.equal(limiter.check("admin").allowed,false);
 clock+=15*60*1000+1;
 assert.equal(limiter.check("admin").allowed,true);
});
test("sucesso limpa contador e chaves invalidas nao passam",()=>{
 const limiter=createAttemptLimiter({now:()=>500});
 for(let i=0;i<4;i++)limiter.fail("admin");
 limiter.success("admin");
 assert.equal(limiter.check("admin").allowed,true);
 assert.equal(limiter.check("").allowed,false);
});
