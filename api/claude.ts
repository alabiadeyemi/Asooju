/**
 * Vercel serverless proxy for Anthropic (browser can't call Anthropic directly — CORS).
 * Locally, Vite proxies /api/claude → api.anthropic.com (see vite.config.ts).
 */
import { applyCors, handleOptions, BodyTooLargeError, readJsonBody } from "./_lib/http";

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    applyCors(req, res);
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  const apiKey = req.headers["x-api-key"];
  if (!apiKey || typeof apiKey !== "string") {
    applyCors(req, res);
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Missing x-api-key header" }));
  }

  try {
    const body = await readJsonBody(req);
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();
    applyCors(req, res);
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(data));
  } catch (error: any) {
    applyCors(req, res);
    res.statusCode = error instanceof BodyTooLargeError ? 413 : 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({ error: error.message || "Claude proxy failed" })
    );
  }
}
