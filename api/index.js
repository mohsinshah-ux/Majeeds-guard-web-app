/** Lazy-load Express so /health and /api/pair/* stay fast on cold start. */
let cachedHandler;

export const config = {
  maxDuration: 60
};

export default async function handler(req, res) {
  if (!cachedHandler) {
    const [{ default: serverless }, { app }] = await Promise.all([
      import("serverless-http"),
      import("../backend/server.js")
    ]);
    cachedHandler = serverless(app);
  }
  return cachedHandler(req, res);
}
