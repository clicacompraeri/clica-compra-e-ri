"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const auth=require("./admin-auth.cjs");
test("senha válida e inválida",()=>{
  const hash=auth.hashPassword("uma senha de teste longa e segura");
  assert.equal(auth.verifyPassword("uma senha de teste longa e segura",hash),true);
  assert.equal(auth.verifyPassword("senha incorreta",hash),false);
  assert.equal(auth.verifyPassword("qualquer","inválido"),false);
});
test("token assinado expira e rejeita adulteração",()=>{
 const secret="segredo-de-teste-com-mais-de-32-caracteres-123";
 const now=Date.UTC(2026,9,19);
 const token=auth.createAdminToken(secret,now);
 assert.equal(auth.verifyAdminToken(token,secret,now),true);
 assert.equal(auth.verifyAdminToken(token,secret,now+31*60*1000),false);
 assert.equal(auth.verifyAdminToken(token+"x",secret,now),false);
 assert.equal(auth.verifyAdminToken(token,"outro-segredo-de-teste-muito-longo-123",now),false);
});
test("cookie administrativo é httpOnly e Secure",()=>{
 const cookie=auth.cookieForAdmin("abc");
 assert.match(cookie,/HttpOnly/);
 assert.match(cookie,/Secure/);
 assert.match(cookie,/SameSite=Strict/);
 assert.match(cookie,/Path=\/admin/);
});
