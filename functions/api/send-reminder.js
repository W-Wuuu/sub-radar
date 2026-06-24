/**
 * POST /api/send-reminder — 发送单封提醒邮件
 * GET  /api/send-reminder — 连通性测试
 */
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: {
      'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'
    }});
  }

  if (request.method === 'GET') {
    return new Response(JSON.stringify({
      status: 'ok',
      resendConfigured: !!env.RESEND_API_KEY
    }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const body = await request.json();
    const { email, subName, expireDate } = body;

    if (!email || !subName || !expireDate) {
      return new Response(JSON.stringify({ error: 'Missing email, subName, or expireDate' }), { status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), { status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    if (!env.RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: true, mode: 'simulated',
        message: 'Email simulated (no RESEND_API_KEY configured)' }), { status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'SubRadar <onboarding@resend.dev>',
        to: email,
        subject: subName + ' — SubRadar Reminder',
        html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;"><h2>Subscription Reminder</h2><p><strong>' + subName + '</strong> expires on <strong>' + expireDate + '</strong>.</p><p>Check if you need to cancel auto-renewal.</p><hr><p style="color:#666;">Cancel guide: <a href="https://radar-t.pages.dev/">radar-t.pages.dev</a></p></div>'
      })
    });

    if (resendResp.ok) {
      const data = await resendResp.json();
      return new Response(JSON.stringify({ success: true, message: 'Email sent to ' + email, id: data.id }), { status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const errText = await resendResp.text();
    return new Response(JSON.stringify({ error: 'Resend API error: ' + errText }), { status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error: ' + err.message }), { status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
}
