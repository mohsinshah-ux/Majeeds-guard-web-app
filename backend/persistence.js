import {
  createStateSnapshot,
  applyStateSnapshot,
  loadPersistedState,
  savePersistedState
} from "./stateStore.js";

const KV_KEY = "kidsguard:state:v1";

const memory = globalThis.__kidsguardState ?? { snapshot: null };
globalThis.__kidsguardState = memory;

/** Vercel KV / Upstash REST — uses write token, not read-only. */
function redisRestConfig() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "";
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

export function isRedisConfigured() {
  return redisRestConfig() !== null;
}

export async function pingRedis() {
  const cfg = redisRestConfig();
  if (!cfg) return { configured: false, ok: false };
  try {
    const res = await fetch(`${cfg.url}/ping`, {
      headers: { Authorization: `Bearer ${cfg.token}` }
    });
    const data = await res.json().catch(() => ({}));
    return { configured: true, ok: res.ok && data?.result === "PONG" };
  } catch {
    return { configured: true, ok: false };
  }
}

async function redisGet(key) {
  const cfg = redisRestConfig();
  if (!cfg) return null;
  const res = await fetch(`${cfg.url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${cfg.token}` }
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.result) return null;
  try {
    return typeof data.result === "string" ? JSON.parse(data.result) : data.result;
  } catch {
    return null;
  }
}

async function redisSet(key, value) {
  const cfg = redisRestConfig();
  if (!cfg) return;
  const body = JSON.stringify(value);
  const res = await fetch(`${cfg.url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json"
    },
    body
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Redis SET failed (${res.status}): ${text}`);
  }
}

/** Load paired devices + telemetry from Redis, memory, or disk (in that order). */
export async function hydrateState(stores) {
  if (memory.snapshot) {
    applyStateSnapshot(stores, memory.snapshot);
    return;
  }

  try {
    const remote = await redisGet(KV_KEY);
    if (remote && typeof remote === "object") {
      applyStateSnapshot(stores, remote);
      memory.snapshot = createStateSnapshot(stores);
      return;
    }
  } catch (err) {
    console.warn("Redis hydrate failed:", err instanceof Error ? err.message : err);
  }

  loadPersistedState(stores);
  memory.snapshot = createStateSnapshot(stores);
}

/** Persist after pairing or any child telemetry upload. */
export async function persistState(stores) {
  const snapshot = createStateSnapshot(stores);
  memory.snapshot = snapshot;
  savePersistedState(stores);

  try {
    await redisSet(KV_KEY, snapshot);
  } catch (err) {
    console.warn("Redis persist failed:", err instanceof Error ? err.message : err);
  }
}
