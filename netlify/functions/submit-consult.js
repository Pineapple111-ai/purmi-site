exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const name = (data.name || '').toString().trim();
  const phone = (data.phone || '').toString().trim();

  if (!name || !phone) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  console.log('ENV check -> TOKEN set:', !!BOT_TOKEN, '| CHAT_ID:', CHAT_ID);

  if (!BOT_TOKEN || !CHAT_ID) {
    console.log('Missing env vars');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  let text =
    '📩 새로운 상담 신청\n' +
    '이름: ' + name + '\n' +
    '연락처: ' + phone + '\n' +
    '유입경로: ' + (data.source || 'direct');

  if (data.campaign) text += '\n캠페인: ' + data.campaign;
  if (data.placement) text += '\n게재위치: ' + data.placement;
  text += '\n신청시각: ' + now;

  const GAS_URL = 'https://script.google.com/macros/s/AKfycbxj0STjXslNEZbdCRdsEirkTCg_O8bvkcmwdCCqfjL3yTu4n_mv6dDDSrDqK55Vl6xp/exec';

  const sheetPromise = fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name,
      phone: phone,
      source: data.source || 'direct',
      campaign: data.campaign || '',
      placement: data.placement || ''
    }),
  }).then(function (r) {
    console.log('Sheet response status:', r.status);
  }).catch(function (err) {
    console.log('Sheet send error:', err.message);
  });

  try {
    const tgRes = await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: text }),
    });

    await sheetPromise;

    const tgJson = await tgRes.json();
    console.log('Telegram response:', JSON.stringify(tgJson));

    if (!tgJson.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Telegram send failed', detail: tgJson }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.log('Internal error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error', detail: err.message }) };
  }
};
