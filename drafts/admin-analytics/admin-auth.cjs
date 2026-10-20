"use strict";
// PROTÓTIPO ISOLADO. Não importado por server.js, nenhuma rota registrada.
// Credenciais devem ficar apenas em variáveis de ambiente de um futuro ambiente de teste.
const crypto=require("node:crypto");
const SESSION_SECONDS=30*60;
function hashPassword(password,salt=crypto.randomBytes(16).toString("hex")){
  if(typeof password!=="string"||password.length<12) throw Error("Senha insuficiente");
  return "scrypt$"+salt+"$"+crypto.scryptSync(password,salt,64).toString("hex");
}
function verifyPassword(password,stored){
  if(typeof password!=="string"||typeof stored!=="string")return false;
  const parts=stored.split("$");
  if(parts[0]==="pbkdf2-sha256"){
    if(parts.length!==4||parts[1]!=="600000"||!/^[a-f0-9]{32}$/.test(parts[2])||!/^[a-f0-9]{64}$/.test(parts[3])||Buffer.byteLength(password,"utf8")>1024)return false;
    const expected=Buffer.from(parts[3],"hex");
    const actual=crypto.pbkdf2Sync(password,Buffer.from(parts[2],"hex"),600000,32,"sha256");
    return crypto.timingSafeEqual(actual,expected);
  }
  if(parts.length!==3||parts[0]!=="scrypt"||!/^[a-f0-9]{32}$/.test(parts[1])||!/^[a-f0-9]{128}$/.test(parts[2]))return false;
  const actual=crypto.scryptSync(password,parts[1],64),expected=Buffer.from(parts[2],"hex");
  return crypto.timingSafeEqual(actual,expected);
}
function mac(data,secret){return crypto.createHmac("sha256",secret).update(data).digest("hex");}
function createAdminToken(secret,now=Date.now()){
  if(typeof secret!=="string"||secret.length<32)throw Error("Segredo administrativo não configurado");
  const exp=Math.floor(now/1000)+SESSION_SECONDS;
  const nonce=crypto.randomBytes(24).toString("hex");
  const payload=exp+"."+nonce;
  return payload+"."+mac(payload,secret);
}
function verifyAdminToken(token,secret,now=Date.now()){
  if(typeof secret!=="string"||secret.length<32||typeof token!=="string"||token.length>300)return false;
  const chunks=token.split(".");
  if(chunks.length!==3||!/^[0-9]{10,12}$/.test(chunks[0])||!/^[a-f0-9]{48}$/.test(chunks[1])||!/^[a-f0-9]{64}$/.test(chunks[2]))return false;
  const exp=Number(chunks[0]),current=Math.floor(now/1000);
  if(exp<=current||exp>current+SESSION_SECONDS)return false;
  const expected=Buffer.from(mac(chunks[0]+"."+chunks[1],secret),"hex");
  return crypto.timingSafeEqual(expected,Buffer.from(chunks[2],"hex"));
}
function cookieForAdmin(token){
  return "ccr_admin="+encodeURIComponent(token)+"; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age="+SESSION_SECONDS;
}
function clearAdminCookie(){return "ccr_admin=; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=0";}
module.exports={hashPassword,verifyPassword,createAdminToken,verifyAdminToken,cookieForAdmin,clearAdminCookie};
