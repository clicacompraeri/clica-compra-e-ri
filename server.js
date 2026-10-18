const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const publicPath = path.join(__dirname, "public");
const privateCoursePath = path.join(__dirname, "private", "clica-do-zero", "aluno", "index.html");

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const HOTMART_PRODUCT_ID = 8746722;
const HOTMART_GRANT_EVENTS = new Set(["PURCHASE_APPROVED","PURCHASE_COMPLETE"]);
const HOTMART_REVOKE_EVENTS = new Set(["PURCHASE_REFUNDED","PURCHASE_CHARGEBACK","PURCHASE_CANCELED","PURCHASE_EXPIRED"]);
const STUDENT_SYNC_URL = "https://yahsrfgftsjioqgqmigk.supabase.co/functions/v1/clica-student-sync";

async function syncStudentAccess(payload){
  const secret = process.env.CLICA_STUDENT_ACCESS_SECRET;
  if(!secret) throw new Error("Student sync secret missing");

  const response = await fetch(STUDENT_SYNC_URL, {
    method:"POST",
    headers:{
      "content-type":"application/json",
      "x-clica-internal":secret
    },
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(5000)
  });

  if(!response.ok) throw new Error("Student sync failed");
}

app.post("/api/hotmart/webhook", async (req, res) => {
  const expected = process.env.HOTMART_HOTTOK || "";
  const supplied = req.headers["x-hotmart-hottok"] || "";

  if(!expected || supplied !== expected) return res.status(401).send("Unauthorized");

  const event = String(req.body?.event || "").toUpperCase();
  const data = req.body?.data || {};
  const productId = Number(data?.product?.id || 0);

  if(productId !== HOTMART_PRODUCT_ID){
    return res.status(200).json({ok:true, ignored:"product"});
  }

  const email = String(data?.buyer?.email || "").trim().toLowerCase();
  if(!email) return res.status(400).send("Buyer email missing");

  try{
    if(HOTMART_GRANT_EVENTS.has(event)){
      await syncStudentAccess({
        action:"grant",
        email,
        full_name:String(data?.buyer?.name || "").trim() || null,
        transaction:String(data?.purchase?.transaction || "").trim() || null,
        product_id:productId,
        purchase_status:String(data?.purchase?.status || event),
        purchase_date:data?.purchase?.order_date || null
      });
    }else if(HOTMART_REVOKE_EVENTS.has(event)){
      const status = event === "PURCHASE_REFUNDED" ? "refunded"
        : event === "PURCHASE_CHARGEBACK" ? "chargeback"
        : event === "PURCHASE_CANCELED" ? "cancelled"
        : "inactive";

      await syncStudentAccess({
        action:"revoke",
        email,
        status,
        purchase_status:String(data?.purchase?.status || event)
      });
    }

    return res.status(200).json({ok:true, event});
  }catch(error){
    console.error("Hotmart webhook error:", error.message);
    return res.status(500).send("Webhook processing failed");
  }
});

function parseCookies(req){
  const raw = req.headers.cookie || "";
  return Object.fromEntries(raw.split(";").map(v => v.trim()).filter(Boolean).map(v => {
    const i = v.indexOf("=");
    return [decodeURIComponent(v.slice(0,i)), decodeURIComponent(v.slice(i+1))];
  }));
}

function signSession(email, issuedAt){
  const secret = process.env.CLICA_SESSION_SECRET || "";
  return crypto.createHmac("sha256", secret).update(email + "|" + issuedAt).digest("hex");
}

function createSession(email){
  const issuedAt = Date.now().toString();
  const sig = signSession(email, issuedAt);
  return Buffer.from(email + "|" + issuedAt + "|" + sig).toString("base64url");
}

function verifySession(token){
  try{
    if(!process.env.CLICA_SESSION_SECRET) return null;
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if(parts.length !== 3) return null;
    const [email, issuedAt, sig] = parts;
    if(Date.now() - Number(issuedAt) > 7 * 24 * 60 * 60 * 1000) return null;
    const expected = signSession(email, issuedAt);
    if(sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return email;
  }catch{
    return null;
  }
}

async function isAllowedStudent(email){
  const url = process.env.CLICA_STUDENT_ACCESS_URL;
  const secret = process.env.CLICA_STUDENT_ACCESS_SECRET;
  if(!url || !secret) return false;

  try{
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-clica-internal": secret
      },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(5000)
    });

    if(!response.ok) return false;
    const data = await response.json();
    return data.allowed === true;
  }catch{
    return false;
  }
}

app.post("/api/aluno/login", async (req, res) => {
  if(!process.env.CLICA_SESSION_SECRET) return res.redirect("/clica-do-zero/aluno-login.html?erro=config");
  const email = String(req.body.email || "").trim().toLowerCase();
  if(!email || !(await isAllowedStudent(email))) return res.redirect("/clica-do-zero/aluno-login.html?erro=acesso");

  const token = createSession(email);
  res.cookie("clica_aluno", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  });
  res.redirect("/clica-do-zero/aluno/");
});

app.get("/api/aluno/logout", (req, res) => {
  res.clearCookie("clica_aluno", { path: "/" });
  res.redirect("/clica-do-zero/aluno-login.html");
});

app.get("/clica-do-zero/aluno/", async (req, res) => {
  const email = verifySession(parseCookies(req).clica_aluno);
  if(!email || !(await isAllowedStudent(email))) {
    res.clearCookie("clica_aluno", { path: "/" });
    return res.redirect("/clica-do-zero/aluno-login.html");
  }

  res.set("Cache-Control", "no-store");
  res.sendFile(privateCoursePath);
});

app.use(express.static(publicPath));

app.use((req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Clica, Compra e Ri rodando na porta ${PORT}`);
});
