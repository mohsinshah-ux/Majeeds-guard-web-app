/**
 * Single API entry for Vercel — loads durable state, then runs Express.
 */
import serverless from "serverless-http";
import { hydrateState, persistState } from "../backend/persistence.js";
import { allStateStores } from "../backend/stores.js";

let expressHandler;

async function getExpressHandler() {
  if (!expressHandler) {
    await hydrateState(allStateStores());
    const { app } = await import("../backend/server.js");
    expressHandler = serverless(app);
  }
  return expressHandler;
}

export const config = {
  maxDuration: 60
};

export default async function handler(req, res) {
  await hydrateState(allStateStores());
  try {
    const h = await getExpressHandler();
    return await h(req, res);
  } finally {
    await persistState(allStateStores());
  }
}
