// dbcart-lead-webhook.js
// 디비카트 "디비전송(NOTI)"에서 이 함수의 URL로 데이터를 보내면
// 텔레그램 그룹으로 알림을 전송합니다.

const TELEGRAM_BOT_TOKEN = "8333507455:AAF_3KRAB2GEjaQanaxKznvSl_GC3zDl4sk";
const TELEGRAM_CHAT_ID = "-5545309365";

exports.handler = async function (event) {
  try {
    let params = {};

    // GET 방식 (쿼리스트링)
    if (event.httpMethod === "GET") {
      params = event.queryStringParameters || {};
    }

    // POST 방식 (JSON 또는 form-urlencoded)
    if (event.httpMethod === "POST") {
      const contentType = event.headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        params = JSON.parse(event.body || "{}");
      } else {
        params = Object.fromEntries(new URLSearchParams(event.body || ""));
      }
    }

    // 받은 항목을 그대로 나열해서 메시지 구성
    const lines = Object.entries(params)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");

    const message = `📩 새 디비 접수 (신협 비상금대출)\n\n${lines || "(전달된 데이터 없음)"}`;

    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
        }),
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ result: "success" }),
    };
  } catch (err) {
    return {
      statusCode: 200, // 디비카트 쪽에서 에러로 재시도 반복하지 않도록 200 유지
      body: JSON.stringify({ result: "error", error: err.message }),
    };
  }
};
