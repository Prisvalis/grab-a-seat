// Prisvalis 網域停放頁 + 官網聯絡表單
// 以 Cloudflare Pages Advanced Mode 部署（本檔案即為 Pages 的 _worker.js 入口）
// 部署方式請見 README.md

const ALLOWED_ORIGINS = ["https://prisvalis.com", "https://www.prisvalis.com"];

// 已正式代管內容、應直接放行給上游服務的網域（純 hostname，不含 scheme）
const ASSIGNED_HOSTS = new Set(["prisvalis.com", "www.prisvalis.com"]);

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function parkingPage(host) {
  const safeHost = escapeHtml(host);
  const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Hosted by Leyun Digital｜樂雲數位</title>
<style>
  * { margin: 0; box-sizing: border-box; }
  body {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: 'Noto Sans TC', 'Segoe UI', system-ui, sans-serif;
    background: linear-gradient(135deg, oklch(22% 0.10 262), oklch(32% 0.12 260) 45%, oklch(40% 0.13 250));
    background-size: 200% 200%; animation: flow 12s ease infinite;
    color: #fff; padding: 24px; text-align: center;
  }
  @keyframes flow { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
  .card { max-width: 560px; }
  .badge {
    display: inline-block; font-size: 13px; letter-spacing: 2px; text-transform: uppercase;
    color: oklch(84% 0.18 92); border: 1px solid oklch(84% 0.18 92 / .5);
    border-radius: 999px; padding: 6px 18px; margin-bottom: 28px;
  }
  .host { font-size: clamp(20px, 4vw, 30px); font-weight: 700; word-break: break-all; margin-bottom: 16px; }
  p { color: oklch(85% 0.02 260); line-height: 1.8; margin-bottom: 8px; font-size: 15px; }
  .divider { width: 48px; height: 2px; background: oklch(63% 0.13 221); margin: 28px auto; border-radius: 2px; }
  .brand { font-size: 14px; color: oklch(75% 0.04 260); margin-bottom: 20px; }
  .brand strong { color: #fff; }
  a.btn {
    display: inline-block; background: oklch(84% 0.18 92); color: oklch(25% 0.05 92);
    font-weight: 700; text-decoration: none; border-radius: 10px; padding: 12px 28px; font-size: 15px;
  }
  a.link { color: oklch(70% 0.10 221); text-decoration: none; font-size: 13px; display: inline-block; margin-top: 18px; }
  @media (prefers-reduced-motion: reduce) { body { animation: none; } }
</style>
</head>
<body>
  <main class="card">
    <span class="badge">Hosted by Prisvalis</span>
    <div class="host">${safeHost}</div>
    <p>此網域由樂雲數位代管，目前尚未設定網站內容。</p>
    <p>This domain is hosted by Prisvalis and has not been configured yet.</p>
    <div class="divider"></div>
    <p class="brand"><strong>樂雲數位有限公司</strong>&nbsp;Prisvalis LTD.</p>
    <a class="btn" href="https://www.prisvalis.com">造訪樂雲官網 / Visit prisvalis.com</a><br>
    <a class="link" href="mailto:support@mail.prisvalis.com">support@mail.prisvalis.com</a>
  </main>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Robots-Tag": "noindex"
    }
  });
}

async function handleContact(request, env) {
  const origin = request.headers.get("Origin") ?? "";
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
    });
  }

  const { name, email, company, message } = body;
  if (!name || !email || !message) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 422,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
    });
  }

  const emailBody = [
    `姓名：${name}`,
    `Email：${email}`,
    company ? `公司：${company}` : null,
    `\n訊息：\n${message}`
  ].filter(Boolean).join("\n");

  await env.EMAIL.send({
    from: "noreply@mail.prisvalis.com",
    to: "support@mail.prisvalis.com",
    subject: `[官網聯絡表單] 來自 ${name}`,
    text: emailBody
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    if (url.pathname === "/api/contact" || host.endsWith(".workers.dev") || host.endsWith(".pages.dev")) {
      return handleContact(request, env);
    }
    if (ASSIGNED_HOSTS.has(host)) {
      return fetch(request);
    }
    return parkingPage(host);
  }
};
