import { redeemDeviceInvitation } from "../../../backend/pairing.js";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Device-Id");
}

export default function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = req.query.token;
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Invitation token is required" });
    return;
  }

  try {
    const result = redeemDeviceInvitation(token, req.body ?? {});
    res.status(result.status).json(result.body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
}
