exports.handler = async function (event) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key not configured." }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON." }) };
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing messages." }) };
  }

  const SYSTEM = `You are Zenmul's AI assistant on zenmul.com. Zenmul is an AI workflow automation studio that builds industry-specific automation suites for small and mid-size businesses, run by Nazmul (Naz), a solo founder based in Bangladesh.

WHAT ZENMUL BUILDS:
Zenmul creates Brain automation suites: sets of 4-5 automated workflows per industry, built on n8n, AI, Gmail, Google Sheets, and Telegram.

THE 11 VERTICALS:
1. Salon Brain: appointment reminders, review requests, no-show follow-ups, rebooking, welcome sequences.
2. Restaurant Brain: reservation confirmations, review collection, feedback responses, promotions, VIP follow-ups.
3. Law Brain: lead intake responses, consultation reminders, document follow-ups, client updates, review requests.
4. Gym Brain: membership renewal reminders, class booking confirmations, drop-off re-engagement, progress check-ins, referral requests.
5. Coach Brain: lead nurture sequences, session reminders, course completion follow-ups, testimonial requests, upsell sequences.
6. Cargo Brain: shipment updates, delivery confirmations, delay notifications, feedback collection.
7. Store Brain: order confirmations, shipping updates, abandoned cart recovery, post-purchase review requests.
8. SaaS Lead Brain: lead qualification, trial follow-up, churn risk detection, renewal reminders.
9. Recruitment Brain: application acknowledgements, interview scheduling, follow-ups, placement confirmations, client updates.
10. Clinic Brain: appointment reminders, post-visit follow-ups.
11. Domain Watchlist Monitor: monitors domain availability and sends alerts.

PRICING: Setup fee plus monthly retainer. Exact pricing is discussed after a free audit call.

HOW IT WORKS:
1. Book a free audit. Naz reviews the business and identifies the biggest time-wasting tasks.
2. Zenmul builds the suite in about a week.
3. System runs 24/7 automatically, no technical knowledge needed.

TONE RULES:
- Be helpful, direct, and conversational. Keep responses under 120 words unless asked for detail.
- No em-dashes. Use commas or short sentences instead.
- If asked about pricing, invite them to book a free audit at zenmul.com.
- If unsure, say to reach out at nazmul@zenmul.com.
- Never invent features, prices, or client names.`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: SYSTEM }, ...messages],
        max_tokens: 300,
        temperature: 0.6,
      }),
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      return {
        statusCode: groqRes.status,
        body: JSON.stringify({ error: data.error?.message || "Groq error." }),
      };
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || "Sorry, no response. Try again.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error. Please try again." }),
    };
  }
};
