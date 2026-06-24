/**
 * GET /api/check-reminders
 * 扫描 KV 中所有未通知的提醒。到期>3天时提前3天提醒，≤3天时当天提醒。
 *
 * 触发方式（按优先级）：
 * 1. Cloudflare Workers Cron Trigger（推荐，需单独配置）
 * 2. 外部免费 cron 服务（如 cron-job.org）每天 GET 一次
 * 3. 客户端打开页面时轮询调用
 *
 * 需要绑定 KV namespace: REMINDERS_KV
 */
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: {
      'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'
    }});
  }

  // Optional: simple API key check for cron services
  const url = new URL(request.url);
  const cronKey = url.searchParams.get('key');

  try {
    if (!env.REMINDERS_KV) {
      return new Response(JSON.stringify({ status: 'no_kv', message: 'KV namespace not configured. Set up REMINDERS_KV binding.' }), { status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    if (!env.RESEND_API_KEY) {
      return new Response(JSON.stringify({ status: 'no_resend', message: 'RESEND_API_KEY not configured.' }), { status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const index = JSON.parse(await env.REMINDERS_KV.get('__index__') || '[]');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let sent = 0, skipped = 0;

    for (const entry of index) {
      if (entry.notified) { skipped++; continue; }

      const expireDate = new Date(entry.expireDate);
      expireDate.setHours(0, 0, 0, 0);

      // Notify 3 days before expiry. If already within 3 days, notify today.
      const notifyStart = new Date(expireDate);
      notifyStart.setDate(notifyStart.getDate() - 3);
      if (today >= notifyStart && today <= expireDate) {
        const record = JSON.parse(await env.REMINDERS_KV.get(entry.id));
        if (!record || record.notified) { skipped++; continue; }

        const daysLeft = Math.ceil((expireDate - today) / 86400000);
        const urgencyText = daysLeft === 0 ? '今天到期！' : daysLeft === 1 ? '明天到期！' : `${daysLeft}天后到期`;

        try {
          const resendResp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: '订阅雷达 <reminder@subradar.dev>',
              to: record.email,
              subject: `⏰ ${record.subName} ${urgencyText} — 订阅雷达提醒`,
              html: `<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;">
                <h2>📅 续费提醒</h2>
                <p>你的订阅 <strong>${record.subName}</strong> 将于 <strong>${record.expireDate}</strong> 到期。</p>
                <p style="font-size:20px;font-weight:700;color:#007AFF;">${urgencyText}</p>
                <hr>
                <p style="color:#666;">如果不再需要，建议立即取消自动续费。</p>
                <p style="color:#666;">取消教程：<a href="https://radar-t.pages.dev/">radar-t.pages.dev</a> → 查教程</p>
                <hr>
                <p style="font-size:12px;color:#999;">此邮件由订阅雷达自动发送。</p>
              </div>`,
            }),
          });

          if (resendResp.ok) {
            // Mark as notified
            record.notified = true;
            entry.notified = true;
            await env.REMINDERS_KV.put(entry.id, JSON.stringify(record));
            sent++;
            console.log(`✅ 提醒已发送: ${record.email} — ${record.subName}`);
          } else {
            console.error(`❌ 发送失败: ${record.email}`, await resendResp.text());
          }
        } catch (e) {
          console.error(`❌ 发送异常: ${record.email}`, e);
        }
      }
    }

    // Update index
    await env.REMINDERS_KV.put('__index__', JSON.stringify(index));

    return new Response(JSON.stringify({ status: 'ok', sent, skipped, total: index.length, checkedAt: new Date().toISOString() }), { status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

  } catch (err) {
    console.error('check-reminders error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
}
