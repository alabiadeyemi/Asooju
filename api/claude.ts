/**
 * Vercel serverless proxy for Anthropic (browser can't call Anthropic directly — CORS).
 * Locally, Vite proxies /api/claude → api.anthropic.com (see vite.config.ts).
 */
export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = req.headers["x-api-key"];
  if (!apiKey || typeof apiKey !== "string") {
    return res.status(401).json({ error: "Missing x-api-key header" });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(upstream.status).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Claude proxy failed" });
  }
}
