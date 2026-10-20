"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createAdminToken}=require("./admin-auth.cjs");
const {authorizeReport}=require("./report-access-policy.cjs");
const secret="segredo-unicamente-para-testes-locais-comprido-2026";
test("nao permite consultar dados sem sessao valida",()=>{
 assert.equal(authorizeReport("",secret,7).code,401);
 assert.equal(authorizeReport("invalido",secret,7).code,401);
 const token=createAdminToken(secret);
 assert.equal(authorizeReport(token+"x",secret,7).code,401);
 assert.equal(authorizeReport(token,"outro-segredo-de-testes-com-mais-de-32-caracteres",7).code,401);
});
test("aceita apenas periodos previstos",()=>{
 const token=createAdminToken(secret);
 for(const days of [1,7,30])assert.equal(authorizeReport(token,secret,days).code,200);
 for(const days of [0,3,31,45,"7",null])assert.equal(authorizeReport(token,secret,days).code,400);
});
