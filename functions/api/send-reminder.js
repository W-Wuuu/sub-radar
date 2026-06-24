/**
 * Cloudflare Pages Function — 到期提醒邮件发送
 *
 * 触发：用户订阅到期当天发送
 * 限额：免费用户3次/月
 * 邮件服务：Resend (https://resend.com) — 免费层100封/天
 *
 * 部署后需在Cloudflare Dashboard设置环境变量：
 *   RESEND_API_KEY = re_xxxxx
 *
 * 调用方式：
 *   POST /api/send-reminder
 *   Body: { email, subName, expireDate, userId }
 */

export async function onRequest(context) {
  const { request, env } = context;

  // CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  // GET: connectivity test
  if (request.method === 'GET') {
    return new Response(JSON.stringify({
      status: 'ok',
      resendConfigured: !!env.RESEND_API_KEY,
      message: env.RESEND_API_KEY ? 'Resend API ready' : 'Resend API key not configured — emails will be simulated'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: '请使用POST请求' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const { email, subName, expireDate, userId } = await request.json();

    // 参数校验
    if (!email || !subName || !expireDate) {
      return new Response(JSON.stringify({ error: '缺少必填参数：email, subName, expireDate' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 邮箱格式校验
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: '邮箱格式不正确' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 如果没有配置 Resend API Key，返回模拟成功（开发阶段）
    if (!env.RESEND_API_KEY) {
      console.log(`[模拟] 提醒邮件已发送: ${email} — ${subName} 将于 ${expireDate} 到期`);
      return new Response(JSON.stringify({
        success: true,
        mode: 'simulated',
        message: `提醒邮件已模拟发送至 ${email}`,
        detail: `${subName} 将于 ${expireDate} 到期，到期当天将收到提醒。`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 真实发送（Resend API）
    const expireDateObj = new Date(expireDate);
    const reminderDate = expireDateObj.toLocaleDateString('zh-CN');

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: '订阅雷达 <reminder@subradar.dev>',
        to: email,
        subject: `⏰ ${subName} — 订阅雷达提醒`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>📅 续费提醒</h2>
            <p>你的订阅 <strong>${subName}</strong> 将于 <strong>${expireDate}</strong> 到期。</p>
            <p>请检查是否需要取消自动续费，避免不必要的扣款。</p>
            <hr>
            <p style="color: #666;">如果不再需要，建议立即取消自动续费。</p>
            <p style="color: #666;">取消教程：<a href="https://radar-t.pages.dev/">radar-t.pages.dev</a> → 查教程</p>
            <hr>
            <p style="font-size: 12px; color: #999;">此邮件由订阅雷达自动发送。如需取消提醒，请回复本邮件。</p>
          </div>
        `,
      }),
    });

    if (resendResponse.ok) {
      const data = await resendResponse.json();
      return new Response(JSON.stringify({
        success: true,
        message: `提醒邮件已发送至 ${email}`,
        id: data.id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } else {
      const err = await resendResponse.text();
      console.error('Resend API error:', err);
      return new Response(JSON.stringify({ error: '邮件发送失败，请稍后重试' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

  } catch (err) {
    console.error('send-reminder error:', err);
    return new Response(JSON.stringify({ error: '服务器内部错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
