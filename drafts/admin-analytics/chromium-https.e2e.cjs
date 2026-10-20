"use strict";
// Optional real-browser smoke test; run separately from *.test.cjs in GitHub Actions.
// Uses an ephemeral self-signed HTTPS server, fake credentials and fake reports.
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),https=require("node:https");
const {spawnSync}=require("node:child_process");
const {chromium}=require("playwright-core");
const {hashPassword}=require("./admin-auth.cjs");
const {createAnalyticsHandler}=require("./analytics-http-candidate.cjs");

test("Chromium HTTPS: login, Secure cookie, live report, period filter, logout and revoked session", {timeout:90000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ccr-browser-"));
 let server,browser;
 const revoked=new Set();
 const secret="fictitious-signing-key-for-isolated-chromium-test-2026";
 const store={
  async isRevoked(token){return revoked.has(token);},
  async revoke(token){revoked.add(token);return true;},
  async report(days){return {
   simulation:false,days,
   metrics:{pageViews:days===30?21:5,productViews:2,outboundClicks:1,courseCheckoutClicks:0},
   daily:[{date:new Date().toISOString().slice(0,10),pageViews:days===30?21:5,productViews:2,outboundClicks:1,courseCheckoutClicks:0}],
   sources:[{name:"direct",value:5}],products:[],stores:[]
  };},
  async ingest(){return true;},async purge(){return 0;}
 };
 try{
  const key=path.join(dir,"key.pem"),cert=path.join(dir,"cert.pem");
  const result=spawnSync("openssl",["req","-x509","-newkey","rsa:2048","-nodes","-keyout",key,"-out",cert,"-days","1","-subj","/CN=localhost","-addext","subjectAltName=IP:127.0.0.1"],{encoding:"utf8",timeout:15000});
  assert.equal(result.status,0,result.stderr||String(result.error));
  let handler;
  server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>handler(req,res));
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const origin="https://127.0.0.1:"+server.address().port;
  handler=createAnalyticsHandler({
   publicOrigin:origin+"/",adminEmail:"admin@example.invalid",
   passwordHash:hashPassword("fake-admin-password-very-strong-2026"),signingKey:secret,store
  });
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||"/usr/bin/google-chrome",args:["--no-sandbox"]});
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844}});
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  let r=await page.goto(origin+"/admin/login");
  assert.equal(r.status(),200);
  assert.match(await page.title(),/Central de Análises/);
  await page.locator('input[name="email"]').fill("admin@example.invalid");
  await page.locator('input[name="password"]').fill("fake-admin-password-very-strong-2026");
  await Promise.all([page.waitForURL(origin+"/admin"),page.locator('button').click()]);
  assert.match(await page.locator("h1").innerText(),/Central de Análises/);
  assert.equal((await page.locator("#views").innerText()).trim(),"5");
  assert.match(await page.locator("#report-kind").innerText(),/DADOS AGREGADOS/);
  const cookies=await context.cookies(origin+"/admin");
  const session=cookies.find(x=>x.name==="ccr_admin");
  assert.ok(session,"Browser did not store administrative cookie");
  assert.equal(session.httpOnly,true);
  assert.equal(session.secure,true);
  assert.equal(session.sameSite,"Strict");
  assert.equal(session.path,"/admin");
  assert.ok(!(await context.cookies(origin+"/")), "Cookie should not be sent to the storefront root");
  await page.locator("#period").selectOption("30");
  await page.waitForFunction(()=>document.getElementById("views").textContent.trim()==="21");
  assert.equal((await page.locator("#period").inputValue()),"30");
  assert.ok(errors.length===0,errors.join(" ; "));
  const oldCookie="ccr_admin="+encodeURIComponent(session.value);
  await Promise.all([page.waitForURL(origin+"/admin/login"),page.locator('form[action="/admin/logout"] button').click()]);
  assert.equal((await context.cookies(origin+"/admin")).filter(x=>x.name==="ccr_admin").length,0);
  const unauth=await context.request.get(origin+"/admin/report?days=7",{headers:{Cookie:oldCookie}});
  assert.equal(unauth.status(),401,"Revoked session should not authorize report");
  await context.close();
 }finally{
  if(browser)await browser.close();
  if(server?.listening)await new Promise(resolve=>server.close(resolve));
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
