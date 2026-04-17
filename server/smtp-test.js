/**
 * SMTP Test — Send the welcome.html email template to any address.
 *
 * Usage:  node smtp-test.js
 * Then open http://localhost:4444 in your browser.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const PORT = 4444;

// ── SMTP transporter (from .env) ────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST,
  port: Number(process.env.SES_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SES_SMTP_USER,
    pass: process.env.SES_SMTP_PASSWORD,
  },
});

// ── Load & fill the welcome template ────────────────────────────────────────

function buildHtml(recipientName) {
  const raw = fs.readFileSync(
    path.join(__dirname, 'email-templates', 'welcome.html'),
    'utf-8',
  );
  return raw
    .replace(/\{\{USERNAME\}\}/g, recipientName || 'Tester')
    .replace(/\{\{DASHBOARD_LINK\}\}/g, process.env.FRONTEND_URL || 'http://localhost:5174')
    .replace(/\{\{STARTING_CREDITS\}\}/g, '5,000')
    .replace(/\{\{YEAR\}\}/g, String(new Date().getFullYear()));
}

// ── Inline HTML page served at / ────────────────────────────────────────────

const PAGE = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SMTP Test</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#111827;color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#1e1e2e;border:1px solid #f97316;border-radius:12px;padding:36px;width:100%;max-width:440px}
  h1{font-size:22px;margin-bottom:6px;color:#f97316}
  p.sub{font-size:13px;color:#94a3b8;margin-bottom:24px}
  label{display:block;font-size:13px;color:#94a3b8;margin-bottom:6px}
  input{width:100%;padding:10px 14px;border-radius:8px;border:1px solid #333;background:#111827;color:#e2e8f0;font-size:15px;margin-bottom:16px}
  input:focus{outline:none;border-color:#f97316}
  button{width:100%;padding:12px;border:none;border-radius:8px;background:#f97316;color:#fff;font-size:16px;font-weight:600;cursor:pointer}
  button:disabled{opacity:.5;cursor:wait}
  .msg{margin-top:16px;font-size:14px;padding:10px 14px;border-radius:8px;display:none}
  .msg.ok{display:block;background:rgba(34,197,94,.15);color:#22c55e;border:1px solid rgba(34,197,94,.3)}
  .msg.err{display:block;background:rgba(239,68,68,.15);color:#ef4444;border:1px solid rgba(239,68,68,.3)}
</style>
</head><body>
<div class="card">
  <h1>SMTP Test</h1>
  <p class="sub">Send the welcome email template via SendLush SMTP.</p>
  <form id="f">
    <label for="to">Recipient Email</label>
    <input id="to" name="to" type="email" placeholder="you@example.com" required>
    <label for="name">Display Name (optional)</label>
    <input id="name" name="name" type="text" placeholder="Tester">
    <button type="submit" id="btn">Send Test Email</button>
  </form>
  <div id="msg" class="msg"></div>
</div>
<script>
const f=document.getElementById('f'),btn=document.getElementById('btn'),msg=document.getElementById('msg');
f.addEventListener('submit',async e=>{
  e.preventDefault();msg.className='msg';msg.textContent='';btn.disabled=true;btn.textContent='Sending…';
  try{
    const r=await fetch('/send',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({to:f.to.value,name:f.name.value})});
    const d=await r.json();
    if(d.ok){msg.className='msg ok';msg.textContent='Sent! Check '+f.to.value;}
    else{msg.className='msg err';msg.textContent=d.error||'Send failed';}
  }catch(err){msg.className='msg err';msg.textContent=err.message;}
  finally{btn.disabled=false;btn.textContent='Send Test Email';}
});
</script>
</body></html>`;

// ── HTTP server ─────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // Serve the page
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(PAGE);
  }

  // Send email endpoint
  if (req.method === 'POST' && req.url === '/send') {
    let body = '';
    for await (const chunk of req) body += chunk;

    try {
      const { to, name } = JSON.parse(body);

      if (!to || typeof to !== 'string' || !to.includes('@')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Invalid email address' }));
      }

      const html = buildHtml(name);

      const info = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Drauwper'}" <${process.env.EMAIL_FROM || 'no-reply@scramblurr.com'}>`,
        to,
        subject: 'Welcome to Drauwper! 🔥',
        html,
      });

      console.log('✅ Email sent:', info.messageId, '→', to);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, messageId: info.messageId }));
    } catch (err) {
      console.error('❌ Send failed:', err.message || err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n🔧 SMTP Test running at http://localhost:${PORT}\n`);
  console.log(`   SMTP Host : ${process.env.SES_SMTP_HOST}`);
  console.log(`   SMTP Port : ${process.env.SES_SMTP_PORT}`);
  console.log(`   SMTP User : ${process.env.SES_SMTP_USER}`);
  console.log(`   From      : ${process.env.EMAIL_FROM}\n`);
});
