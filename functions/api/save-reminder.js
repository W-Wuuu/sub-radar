/**
 * POST /api/save-reminder
 * 保存提醒到 KV 存储（如有绑定），否则返回 success 让前端自行管理。
 * Body: { email, subName, expireDate }
 */
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: {
      'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'
    }});
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const { email, subName, expireDate } = await request.json();
    if (!email || !subName || !expireDate) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const record = {
      email, subName, expireDate,
      createdAt: new Date().toISOString(),
      notified: false
    };

    // Try KV storage
    if (env.REMINDERS_KV) {
      const id = `reminder:${Date.now()}:${Math.random().toString(36).slice(2,8)}`;
      await env.REMINDERS_KV.put(id, JSON.stringify(record));
      // Also add to index for daily scan
      const index = JSON.parse(await env.REMINDERS_KV.get('__index__') || '[]');
      index.push({ id, expireDate, notified: false });
      // Keep only last 1000 entries
      if (index.length > 1000) {
        const toRemove = index.splice(0, index.length - 1000);
        for (const r of toRemove) { await env.REMINDERS_KV.delete(r.id); }
      }
      await env.REMINDERS_KV.put('__index__', JSON.stringify(index));

      return new Response(JSON.stringify({ success: true, stored: 'kv', id }), { status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // No KV fallback — client-side handles scheduling
    return new Response(JSON.stringify({ success: true, stored: 'client', message: 'KV not configured, client-side scheduling active' }), { status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

  } catch (err) {
    console.error('save-reminder error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
}
