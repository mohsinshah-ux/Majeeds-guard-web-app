/**
 * Single Vercel API entry — health, pairing, devices, then Express for telemetry.
 */
import { createDeviceInvitation, redeemDeviceInvitation, refreshStateFromDisk, persistStateToDisk } from "../backend/pairing.js";
import { allStateStores, boundDevices } from "../backend/stores.js";

let expressHandler;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Device-Id");
}

function pathOf(req) {
  const raw = req.url || "/";
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return new URL(raw).pathname;
    }
  } catch {
    /* fall through */
  }
  const path = raw.split("?")[0];
  return path.startsWith("/") ? path : `/${path}`;
}

function isDevicesListPath(path) {
  return path === "/api/devices" || path === "/devices";
}

async function delegateToExpress(req, res) {
  refreshStateFromDisk();
  if (!expressHandler) {
    const [{ default: serverless }, { app }] = await Promise.all([
      import("serverless-http"),
      import("../backend/server.js")
    ]);
    expressHandler = serverless(app);
  }
  return expressHandler(req, res);
}

export default async function handler(req, res) {
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

  if (req.method === "GET" && isDevicesListPath(path)) {
    refreshStateFromDisk();
    res.status(200).json([...boundDevices]);
    return;
  }

  if (
    req.method === "POST" &&
    (path === "/api/device-invitations" || path === "/api/device-invitations/")
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

  try {
    return await delegateToExpress(req, res);
  } finally {
    persistStateToDisk();
  }
}
