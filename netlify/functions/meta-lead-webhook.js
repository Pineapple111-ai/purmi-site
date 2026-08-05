exports.handler = async (event) => {
  // 1) Meta 웹훅 인증 (최초 등록 시 GET 요청으로 검증)
  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters || {};
    const verifyToken = process.env.FB_VERIFY_TOKEN;

    if (params["hub.verify_token"] === verifyToken) {
      return {
        statusCode: 200,
        body: params["hub.challenge"],
      };
    }
    return { statusCode: 403, body: "인증 실패" };
  }

  // 2) 실제 리드 발생 시 POST 요청
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body);
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const leadgenId = change?.value?.leadgen_id;

      if (!leadgenId) {
        return { statusCode: 200, body: "무시됨 (leadgen_id 없음)" };
      }

      // 리드 상세정보 가져오기
      const pageToken = process.env.FB_PAGE_ACCESS_TOKEN;
      const leadRes = await fetch(
        `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${pageToken}`
      );
      const leadData = await leadRes.json();

      const fields = leadData.field_data || [];
      const info = fields
        .map((f) => `${f.name}: ${f.values?.[0]}`)
        .join("\n");

      // 텔레그램 전송
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      const message = `📢 푸르미론 신규 리드\n\n${info}`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      });

      return { statusCode: 200, body: "OK" };
    } catch (err) {
      console.error(err);
      return { statusCode: 500, body: "에러 발생" };
    }
  }

  return { statusCode: 405, body: "허용되지 않은 메서드" };
};