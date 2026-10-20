"use strict";
// Revogacao temporaria apenas para laboratorio local.
const crypto=require("node:crypto");
const {verifyAdminToken}=require("./admin-auth.cjs");
function createSessionRegistry({now=Date.now}={}){
 const revoked=new Map();
 function digest(token){return crypto.createHash("sha256").update(token).digest("hex");}
 function cleanup(){const time=Math.floor(now()/1000);for(const [id,exp] of revoked)if(exp<=time)revoked.delete(id);}
 function isActive(token,secret){
  cleanup();
  if(!verifyAdminToken(token,secret,now()))return false;
  return !revoked.has(digest(token));
 }
 function revoke(token,secret){
  if(!verifyAdminToken(token,secret,now()))return false;
  cleanup();
  revoked.set(digest(token),Number(token.split(".")[0]));
  return true;
 }
 return Object.freeze({isActive,revoke});
}
module.exports={createSessionRegistry};
