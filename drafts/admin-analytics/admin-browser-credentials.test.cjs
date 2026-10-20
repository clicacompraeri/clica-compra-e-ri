"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const {verifyPassword,hashPassword}=require("./admin-auth.cjs");
test("senha gerada pelo navegador em PBKDF2 600000 funciona no Node, scrypt antigo permanece",()=>{
 const password="Senha-Forte-Ficticia-2026!+-test";
 const salt=crypto.randomBytes(16);
 const hash=crypto.pbkdf2Sync(password,salt,600000,32,"sha256");
 const stored=["pbkdf2-sha256","600000",salt.toString("hex"),hash.toString("hex")].join("$");
 assert.equal(verifyPassword(password,stored),true);
 assert.equal(verifyPassword("senha-incorreta",stored),false);
 assert.equal(verifyPassword(password,stored.replace("$600000$","$1$")),false);
 assert.equal(verifyPassword(password,stored.replace(/.$/,"z")),false);
 const old=hashPassword("Senha-Forte-Ficticia-2026!+-test");
 assert.equal(verifyPassword(password,old),true);
});
