/**
 * API base URL for parent web app.
 * - Local dev: http://localhost:8080 (Vite proxies /api when empty)
 * - Vercel: same origin (empty) — vercel.json rewrites /api to serverless backend
 * - Override: set VITE_API_BASE_URL in Vercel project env
 */
export function getApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  if (configured) return configured;
  if (import.meta.env.PROD) return "";
  return "http://localhost:8080";
}
