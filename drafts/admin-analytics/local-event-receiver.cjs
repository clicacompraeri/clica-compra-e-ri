"use strict";
// Receptor experimental APENAS localhost. Nao instalar no servidor publico.
// Usa eventos anonimos normalizados, sem IP, email, cookie ou URL completa.
const {createFileStore}=require("./file-event-store.cjs");
const {normalizeEvent}=require("./event-model.cjs");
function createLocalEventReceiver({directory,secret}={}){
 if(typeof secret!=="string"||secret.length<32)throw Error("Segredo de laboratorio obrigatorio");
 const store=createFileStore({directory});
 return async function receive(req,res){
  const fail=(code)=>{res.writeHead(code,{"Cache-Control":"no-store","Content-Type":"application/json","X-Content-Type-Options":"nosniff"});res.end(JSON.stringify({accepted:false}));};
  if(req.method!=="POST"||req.url!=="/lab/events")return fail(404);
  if(req.socket.remoteAddress!=="127.0.0.1"&&req.socket.remoteAddress!=="::1"&&req.socket.remoteAddress!=="::ffff:127.0.0.1")return fail(403);
  if(req.headers["x-lab-secret"]!==secret)return fail(401);
  if(!String(req.headers["content-type"]||"").startsWith("application/json"))return fail(415);
  let raw="";let length=0;
  try{for await(const chunk of req){length+=chunk.length;if(length>2048)return fail(413);raw+=chunk.toString("utf8");}}
  catch{return fail(400);}
  let event;try{event=JSON.parse(raw);}catch{return fail(400);}
  const normalized=normalizeEvent(event);
  if(!normalized)return fail(422);
  try{if(!store.append(normalized).accepted)return fail(422);}catch{return fail(503);}
  res.writeHead(202,{"Cache-Control":"no-store","Content-Type":"application/json","X-Content-Type-Options":"nosniff"});
  return res.end(JSON.stringify({accepted:true}));
 };
}
module.exports={createLocalEventReceiver};
