/**
 * Single lightweight handler for health + pairing (shared /tmp state on Vercel).
 * Does NOT load Express — responds in milliseconds on cold start.
 */
import { createDeviceInvitation, redeemDeviceInvitation } from "../backend/pairing.js";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Device-Id");
}

function pathOf(req) {
  const raw = req.url || "/";
  return raw.split("?")[0];
}

export default function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const path = pathOf(req);

  if (req.method === "GET" && (path === "/health" || path === "/api/health")) {
    res.status(200).json({
      status: "ok",
      service: "parental-control-backend",
      vercel: Boolean(process.env.VERCEL)
    });
    return;
  }

  if (
    req.method === "POST" &&
    (path === "/api/device-invitations" || path.endsWith("/device-invitations"))
  ) {
    try {
      const label = typeof req.body?.label === "string" ? req.body.label.trim() : "";
      const result = createDeviceInvitation(label);
      res.status(result.status).json(result.body);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === "POST" && (path === "/api/pair/redeem" || path.endsWith("/pair/redeem"))) {
    try {
      const token =
        (typeof req.body?.token === "string" && req.body.token.trim()) || "";
      if (!token) {
        res.status(400).json({ error: "Pairing token is required" });
        return;
      }
      const result = redeemDeviceInvitation(token, req.body ?? {});
      res.status(result.status).json(result.body);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({ error: message });
    }
    return;
  }

  res.status(404).json({ error: `Guard route not found: ${req.method} ${path}` });
}
