/**
 * Vercel API entry — fast routes first, Express only as fallback.
 */
import serverless from "serverless-http";
import { hydrateState, persistState } from "../backend/persistence.js";
import { tryFastRoute } from "../backend/guardRouter.js";
import { allStateStores } from "../backend/stores.js";

let expressHandler;

async function getExpressHandler() {
  if (!expressHandler) {
    const { app } = await import("../backend/server.js");
    expressHandler = serverless(app, { binary: false });
  }
  return expressHandler;
}

export const config = {
  maxDuration: 60
};

export default async function handler(req, res) {
  await hydrateState(allStateStores());
  try {
    const handled = await tryFastRoute(req, res);
    if (handled) return;
    const h = await getExpressHandler();
    return await h(req, res);
  } catch (err) {
    console.error("API handler error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : "Internal server error"
        })
      );
    }
  } finally {
    await persistState(allStateStores());
  }
}
