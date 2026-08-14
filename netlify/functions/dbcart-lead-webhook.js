// dbcart-lead-webhook.js
const TELEGRAM_BOT_TOKEN = "8333507455:AAF_3KRAB2GEjaQanaxKznvSl_GC3zDl4sk";
const TELEGRAM_CHAT_ID = "-5545309365";
const SHEET_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbxj0STjXslNEZbdCRdsEirkTCg_O8bvkcmwdCCqfjL3yTu4n_mv6dDDSrDqK55Vl6xp/exec";

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
    if (event.httpMethod === "GET") {
      params = event.queryStringParameters || {};
    }
    if (event.httpMethod === "POST") {
      const contentType = event.headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        params = JSON.parse(event.body || "{}");
      } else {
        params = Object.fromEntries(new URLSearchParams(event.body || ""));
      }
    }

    function formatDateTime(dateStr, timeStr) {
      if (!dateStr || !timeStr) return `${dateStr || ""} ${timeStr || ""}`.trim();
      const [year, month, day] = dateStr.split(".").map((v) => parseInt(v, 10));
      const [hour24, minute] = timeStr.split(":");
      const h = parseInt(hour24, 10);
      const ampm = h < 12 ? "am" : "pm";
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      return `${year}. ${month}. ${day} ${ampm} ${hour12}:${minute}`;
    }

    const isNewLanding = !!params.category; // 새 랜딩페이지는 카테고리 값을 보냄

    const message =
      `📩 새 디비 접수 (랜딩페이지 캠페인)\n\n` +
      `이름: ${params.name || "-"}\n` +
      `연락처: ${params.phone || "-"}\n` +
      `유입경로: ${detectSource(params.referer)}\n` +
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

    if (isNewLanding) {
      // 새 랜딩페이지 → 디비통합 시트(체험단 탭)로 기록
      await fetch(SHEET_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetName: "디비통합",
          name: params.name || "",
          phone: params.phone || "",
          category: params.category || "",
          time: formatDateTime(params.date, params.time),
          source: detectSource(params.referer),
          campaign: "체험단",
        }),
      });
    } else {
      // 기존 랜딩페이지 → 푸르미론 디비 시트로 기록
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
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ result: "success" }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      body: JSON.stringify({ result: "error", error: err.message }),
    };
  }
};
