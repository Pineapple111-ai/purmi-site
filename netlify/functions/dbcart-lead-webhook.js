// dbcart-lead-webhook.js
// 디비카트 "디비전송(NOTI)"에서 이 함수의 URL로 데이터를 보내면
// 텔레그램 그룹으로 알림을 전송합니다.

const TELEGRAM_BOT_TOKEN = "8333507455:AAF_3KRAB2GEjaQanaxKznvSl_GC3zDl4sk";
const TELEGRAM_CHAT_ID = "-5545309365";
const SHEET_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbxj0STjXslNEZbdCRdsEirkTCg_O8bvkcmwdCCqfjL3yTu4n_mv6dDDSrDqK55Vl6xp/exec";

// 리퍼러 문자열로 fb/ig 판별
function detectSource(referer) {
  if (!referer) return "-";
  const r = referer.toLowerCase();
  if (r.includes("instagram")) return "ig";
  if (r.includes("facebook") || r.includes("fb.com") || r.includes("l.php")) return "fb";
  return referer;
}

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

    // 날짜(2026.08.05) + 시간(17:22, 24시간제)를 "2026. 8. 5 pm 5:22" 형태로 변환
    function formatDateTime(dateStr, timeStr) {
      if (!dateStr || !timeStr) return `${dateStr || ""} ${timeStr || ""}`.trim();
      const [year, month, day] = dateStr.split(".").map((v) => parseInt(v, 10));
      const [hour24, minute] = timeStr.split(":");
      const h = parseInt(hour24, 10);
      const ampm = h < 12 ? "am" : "pm";
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      return `${year}. ${month}. ${day} ${ampm} ${hour12}:${minute}`;
    }

    const message =
      `📩 새 디비 접수 (신협 비상금대출)\n\n` +
      `이름: ${params.name || "-"}\n` +
      `연락처: ${params.phone || "-"}\n` +
      `신청시각: ${formatDateTime(params.date, params.time)}`;

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

    // 구글시트에도 기록
    await fetch(SHEET_WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: params.name || "",
        phone: params.phone || "",
        source: detectSource(params.referer),
        campaign: "랜딩페이지_신협",
        time: formatDateTime(params.date, params.time),
      }),
    });

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
