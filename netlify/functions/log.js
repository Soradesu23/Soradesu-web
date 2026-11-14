// Netlify Serverless Function: Secure Discord Logger
// Keeps the Webhook URL completely hidden from client-side view-source

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const webhookURL = process.env.DISCORD_WEBHOOK_URL || 
        "https://discord.com/api/webhooks/1451874420800098429/WHKYeK_Gm2FM8OyLrpBwUPzlB9tluDsdvaEFAxHSLRTlxGs5RrT0bBO2NfuL5UnT7mYM";

    try {
        const res = await fetch(webhookURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: event.body
        });

        return {
            statusCode: res.ok ? 200 : res.status,
            body: JSON.stringify({ success: res.ok })
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
};
