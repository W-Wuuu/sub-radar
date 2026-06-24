/**
 * GET /api/check-reminders
 * Scans KV for unnotified reminders. Sends emails for those due within window.
 * Add ?bypass_quota=1 to skip any quota limits.
 */
function beijingToday() {
  var now = new Date();
  var bj = new Date(now.getTime() + 8 * 3600000);
  bj.setHours(0, 0, 0, 0);
  return bj;
}

function parseBeijingDate(dateStr) {
  return new Date(dateStr + 'T00:00:00+08:00');
}

export async function onRequest(context) {
  var request = context.request;
  var env = context.env;
  var url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    if (!env.REMINDERS_KV) {
      return new Response(JSON.stringify({ status: 'no_kv' }), { status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    if (!env.RESEND_API_KEY) {
      return new Response(JSON.stringify({ status: 'no_resend' }), { status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    var index = JSON.parse(await env.REMINDERS_KV.get('__index__') || '[]');
    var today = beijingToday();
    var bypassQuota = url.searchParams.get('bypass_quota') === '1';
    var forceSend = url.searchParams.get('force_send') === '1';
    var sent = 0;
    var skipped = 0;
    var diag = [];

    for (var i = 0; i < index.length; i++) {
      var entry = index[i];

      if (entry.notified) {
        diag.push({ id: entry.id, expireDate: entry.expireDate, reason: 'already_notified_in_index' });
        skipped++;
        continue;
      }

      var expireDate = parseBeijingDate(entry.expireDate);
      var notifyStart = new Date(expireDate);
      notifyStart.setDate(notifyStart.getDate() - 3);

      if (!forceSend && !(today >= notifyStart && today <= expireDate)) {
        diag.push({
          id: entry.id, expireDate: entry.expireDate, reason: 'not_in_window',
          today: today.toISOString(), notifyStart: notifyStart.toISOString()
        });
        skipped++;
        continue;
      }

      var record = JSON.parse(await env.REMINDERS_KV.get(entry.id));
      if (!record) {
        diag.push({ id: entry.id, expireDate: entry.expireDate, reason: 'record_not_found_in_kv' });
        skipped++;
        continue;
      }
      if (record.notified) {
        diag.push({ id: entry.id, expireDate: entry.expireDate, reason: 'record_already_notified' });
        skipped++;
        continue;
      }

      var daysLeft = Math.ceil((expireDate - today) / 86400000);
      var urgencyText = daysLeft <= 0 ? '今天到期！' : daysLeft === 1 ? '明天到期！' : daysLeft + '天后到期';

      try {
        var resendResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + env.RESEND_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'SubRadar <onboarding@resend.dev>',
            to: record.email,
            subject: record.subName + ' ' + urgencyText + ' — SubRadar',
            html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;"><h2>Subscription Reminder</h2><p><strong>' + record.subName + '</strong> expires on <strong>' + record.expireDate + '</strong>.</p><p style="font-size:20px;color:#007AFF;">' + urgencyText + '</p><hr><p style="color:#666;">Cancel guide: <a href="https://radar-t.pages.dev/">radar-t.pages.dev</a></p></div>'
          })
        });

        if (resendResp.ok) {
          record.notified = true;
          entry.notified = true;
          await env.REMINDERS_KV.put(entry.id, JSON.stringify(record));
          sent++;
        } else {
          var errText = await resendResp.text();
          diag.push({ id: entry.id, reason: 'resend_api_error', error: errText.substring(0, 200) });
        }
      } catch (e) {
        diag.push({ id: entry.id, reason: 'send_exception', error: e.message });
      }
    }

    await env.REMINDERS_KV.put('__index__', JSON.stringify(index));

    return new Response(JSON.stringify({
      status: 'ok', sent: sent, skipped: skipped, total: index.length,
      bypassQuota: bypassQuota,
      checkedAt: new Date().toISOString(),
      beijingTime: new Date(new Date().getTime() + 8 * 3600000).toISOString(),
      diagnostics: diag.slice(0, 30)
    }), { status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error: ' + err.message }), { status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
}
