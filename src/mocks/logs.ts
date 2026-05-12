import type { Level, LogLine } from "@/types/log";

const ANCHOR = new Date("2026-05-11T13:00:00Z").getTime();
const t = (min: number, sec: number): number =>
  ANCHOR + min * 60_000 + sec * 1_000;

export const INSTANCES = ["kc4qn", "m7w3p", "t2x8r"] as const;
export type InstanceId = (typeof INSTANCES)[number];

export const REQUEST_IDS = {
  r4d8a2: "kc4qn",
  k9b3c7: "m7w3p",
  p2x6n1: "t2x8r",
} as const satisfies Record<string, InstanceId>;

export type RequestId = keyof typeof REQUEST_IDS;

type PartialLogLine = Omit<LogLine, "id">;

const make = (
  level: Level,
  min: number,
  sec: number,
  instance: InstanceId,
  message: string,
  requestId?: RequestId,
): PartialLogLine => ({
  timestamp: t(min, sec),
  instance,
  level,
  message,
  ...(requestId ? { requestId } : {}),
});

const info: (
  min: number,
  sec: number,
  instance: InstanceId,
  message: string,
  requestId?: RequestId,
) => PartialLogLine = (min, sec, inst, msg, req) =>
  make("INFO", min, sec, inst, msg, req);
const warn: typeof info = (min, sec, inst, msg, req) =>
  make("WARN", min, sec, inst, msg, req);
const err: typeof info = (min, sec, inst, msg, req) =>
  make("ERROR", min, sec, inst, msg, req);
const dbg: typeof info = (min, sec, inst, msg, req) =>
  make("DEBUG", min, sec, inst, msg, req);

/*
 * Key narrative lines: each request flow lives somewhere in here with
 * at least one severity escalation, and a handful of standalone
 * WARN / ERROR lines exist outside any specific request so the
 * "Errors only" filter has variety beyond just request-bound errors.
 */
const STORY: readonly PartialLogLine[] = [
  // Boot
  info(0, 2, "kc4qn", "Server listening on port 3000"),
  info(0, 5, "m7w3p", "Server listening on port 3000"),
  info(0, 8, "t2x8r", "Server listening on port 3000"),

  // r4d8a2 flow on kc4qn
  info(1, 38, "kc4qn", "GET /api/users 200 in 38ms", "r4d8a2"),
  info(6, 43, "kc4qn", "GET /api/products/42 200 in 24ms", "r4d8a2"),
  warn(11, 18, "kc4qn", "Slow query: SELECT users WHERE id = $1 took 412ms", "r4d8a2"),
  err(16, 4, "kc4qn", "db query failed: pq: too many connections for role 'app'", "r4d8a2"),
  info(16, 22, "kc4qn", "Retry succeeded after 2 attempts", "r4d8a2"),
  info(22, 9, "kc4qn", "GET /api/users 200 in 41ms", "r4d8a2"),
  info(34, 15, "kc4qn", "GET /api/products 200 in 29ms", "r4d8a2"),
  info(48, 7, "kc4qn", "POST /api/events 202 in 12ms", "r4d8a2"),

  // k9b3c7 flow on m7w3p
  info(2, 11, "m7w3p", "POST /api/sessions 201 in 64ms", "k9b3c7"),
  info(7, 51, "m7w3p", "GET /api/notifications 200 in 47ms", "k9b3c7"),
  warn(13, 32, "m7w3p", "Cache miss rate elevated: 0.36 (expected <0.30)", "k9b3c7"),
  err(19, 5, "m7w3p", "request timeout after 30000ms", "k9b3c7"),
  info(25, 22, "m7w3p", "POST /api/sessions 201 in 59ms", "k9b3c7"),
  info(38, 41, "m7w3p", "GET /api/notifications 200 in 49ms", "k9b3c7"),
  info(52, 16, "m7w3p", "POST /api/sessions 201 in 62ms", "k9b3c7"),

  // p2x6n1 flow on t2x8r
  info(3, 8, "t2x8r", "GET /api/orders 200 in 51ms", "p2x6n1"),
  info(9, 15, "t2x8r", "PATCH /api/orders/42 200 in 72ms", "p2x6n1"),
  info(14, 48, "t2x8r", "GET /api/orders 200 in 48ms", "p2x6n1"),
  warn(20, 48, "t2x8r", "Cache miss rate elevated: 0.34 (expected <0.30)", "p2x6n1"),
  err(27, 32, "t2x8r", "DB pool acquire timed out after 5000ms", "p2x6n1"),
  info(33, 35, "t2x8r", "GET /api/orders 200 in 49ms", "p2x6n1"),
  info(45, 22, "t2x8r", "PATCH /api/orders/43 200 in 68ms", "p2x6n1"),

  // Scattered standalone severities
  warn(8, 1, "kc4qn", "Retry attempt 1/3 (op=fetch_user_events)"),
  err(17, 52, "kc4qn", "upstream pool exhausted, dropping request"),
  warn(24, 17, "kc4qn", "DB pool wait time: 24ms (typical <5ms)"),
  err(30, 12, "t2x8r", "db connection refused: dial tcp 10.0.0.4:5432: i/o timeout"),
  warn(36, 44, "m7w3p", "Slow upstream: api.stripe.com responded in 924ms"),
  err(41, 28, "kc4qn", "request timeout after 30000ms"),
  warn(50, 18, "t2x8r", "DB pool wait time: 18ms (typical <5ms)"),
  err(55, 33, "m7w3p", "db query failed: context deadline exceeded"),
];

const HOUR_SEC = 60 * 60;
const pick = <T>(arr: readonly T[], i: number): T =>
  arr[((i % arr.length) + arr.length) % arr.length];
const min = (s: number): number => Math.floor(s / 60);
const ss = (s: number): number => s % 60;

/*
 * Loop-local rotator: each generator advances its own counter so the
 * three instances appear in even proportion within that pattern,
 * regardless of timing-step quirks. `phase` staggers the starting
 * instance across patterns so each one isn't biased to the same first
 * instance.
 */
function rotator(phase: number) {
  let i = 0;
  return (): InstanceId => pick(INSTANCES, phase + i++);
}

const ENDPOINTS = [
  "/api/users",
  "/api/orders",
  "/api/products",
  "/api/notifications",
  "/api/sessions",
  "/api/events",
  "/api/uploads",
  "/api/health",
] as const;

const METHODS = ["GET", "GET", "GET", "POST", "PATCH", "DELETE"] as const;
const STATUS_FOR: Record<string, string> = {
  GET: "200",
  POST: "201",
  PATCH: "200",
  DELETE: "204",
};

const UPSTREAMS = [
  "api.stripe.com",
  "hooks.slack.com",
  "api.twilio.com",
  "api.sendgrid.com",
] as const;

const QUERY_TARGETS = [
  "SELECT users WHERE id = $1",
  "SELECT orders WHERE org_id = $1",
  "INSERT events",
  "UPDATE sessions WHERE token = $1",
  "SELECT products WHERE category = $1",
] as const;

const CACHE_KEYS = ["users", "orders", "products", "sessions", "notifications"] as const;

const JOB_NAMES = [
  "session-cleanup",
  "token-refresh",
  "metrics-flush",
  "cache-warm",
  "billing-reconcile",
] as const;

const TENANTS = ["acme", "globex", "initech", "umbrella", "stark"] as const;

/*
 * Procedural background noise — many small generators, each with its
 * own cadence and message family. Together they give the feed enough
 * texture and severity variety to make filtering and context-window
 * navigation feel meaningful.
 */
function generateNoise(): PartialLogLine[] {
  const noise: PartialLogLine[] = [];

  // ── INFO patterns ──────────────────────────────────────────────

  // Heartbeats (~40s cadence)
  let r = rotator(0);
  for (let s = 18; s < HOUR_SEC; s += 36 + (s % 11)) {
    noise.push(info(min(s), ss(s), r(), "Heartbeat sent"));
  }

  // Healthchecks (~42s cadence)
  r = rotator(1);
  for (let s = 24; s < HOUR_SEC; s += 38 + (s % 9)) {
    noise.push(info(min(s), ss(s), r(), "Healthcheck OK"));
  }

  // Generic API requests (~48s cadence)
  r = rotator(2);
  for (let s = 36; s < HOUR_SEC; s += 42 + (s % 13)) {
    const method = pick(METHODS, s);
    const path = pick(ENDPOINTS, s + 1);
    const status = STATUS_FOR[method];
    const ms = 12 + (s % 80);
    noise.push(info(min(s), ss(s), r(), `${method} ${path} ${status} in ${ms}ms`));
  }

  // DB queries (~95s)
  r = rotator(0);
  for (let s = 56; s < HOUR_SEC; s += 88 + (s % 15)) {
    const q = pick(QUERY_TARGETS, s);
    const ms = 4 + (s % 28);
    noise.push(info(min(s), ss(s), r(), `DB query: ${q} (${ms}ms)`));
  }

  // Cache invalidations (~150s)
  r = rotator(1);
  for (let s = 89; s < HOUR_SEC; s += 140 + (s % 19)) {
    const key = pick(CACHE_KEYS, s);
    noise.push(info(min(s), ss(s), r(), `Cache invalidated: ${key}`));
  }

  // Metrics flushes (~130s)
  r = rotator(2);
  for (let s = 47; s < HOUR_SEC; s += 120 + (s % 17)) {
    const n = 18 + (s % 24);
    noise.push(info(min(s), ss(s), r(), `Metrics flushed (count=${n})`));
  }

  // Background jobs (~135s)
  r = rotator(0);
  for (let s = 71; s < HOUR_SEC; s += 125 + (s % 19)) {
    const job = pick(JOB_NAMES, s);
    const ms = 30 + (s % 60);
    noise.push(info(min(s), ss(s), r(), `Background job '${job}' completed in ${ms}ms`));
  }

  // Cache hit ratios (~160s)
  r = rotator(1);
  for (let s = 93; s < HOUR_SEC; s += 150 + (s % 21)) {
    const ratio = (88 + (s % 8)) / 100;
    noise.push(info(min(s), ss(s), r(), `Cache hit ratio: ${ratio.toFixed(2)}`));
  }

  // Connection retry succeeded (~290s)
  r = rotator(2);
  for (let s = 220; s < HOUR_SEC; s += 270 + (s % 31)) {
    const attempts = 2 + (s % 2);
    noise.push(
      info(min(s), ss(s), r(), `Connection retry succeeded after ${attempts} attempts`),
    );
  }

  // ── DEBUG patterns ─────────────────────────────────────────────

  // GC paused (~155s)
  r = rotator(0);
  for (let s = 67; s < HOUR_SEC; s += 145 + (s % 23)) {
    const ms = 10 + (s % 12);
    noise.push(dbg(min(s), ss(s), r(), `GC paused ${ms}ms`));
  }

  // Connection pool snapshots (~190s)
  r = rotator(1);
  for (let s = 113; s < HOUR_SEC; s += 175 + (s % 13)) {
    const active = 3 + (s % 10);
    noise.push(dbg(min(s), ss(s), r(), `Connection pool: ${active}/20 active`));
  }

  // ── WARN patterns ──────────────────────────────────────────────

  // Slow upstream (~215s)
  r = rotator(2);
  for (let s = 145; s < HOUR_SEC; s += 200 + (s % 27)) {
    const upstream = pick(UPSTREAMS, s);
    const ms = 600 + (s % 500);
    noise.push(
      warn(min(s), ss(s), r(), `Slow upstream: ${upstream} responded in ${ms}ms`),
    );
  }

  // Cache miss elevated (~270s)
  r = rotator(0);
  for (let s = 178; s < HOUR_SEC; s += 255 + (s % 23)) {
    const ratio = (31 + (s % 12)) / 100;
    noise.push(
      warn(
        min(s),
        ss(s),
        r(),
        `Cache miss rate elevated: ${ratio.toFixed(2)} (expected <0.30)`,
      ),
    );
  }

  // DB pool wait (~295s)
  r = rotator(1);
  for (let s = 230; s < HOUR_SEC; s += 280 + (s % 19)) {
    const ms = 8 + (s % 22);
    noise.push(
      warn(min(s), ss(s), r(), `DB pool wait time: ${ms}ms (typical <5ms)`),
    );
  }

  // Rate limit approaching (~330s)
  r = rotator(2);
  for (let s = 280; s < HOUR_SEC; s += 310 + (s % 29)) {
    const tenant = pick(TENANTS, s);
    const n = 78 + (s % 18);
    noise.push(
      warn(
        min(s),
        ss(s),
        r(),
        `Rate limit approaching for tenant '${tenant}' (${n}/100)`,
      ),
    );
  }

  // Slow query (~370s)
  r = rotator(0);
  for (let s = 312; s < HOUR_SEC; s += 350 + (s % 27)) {
    const q = pick(QUERY_TARGETS, s);
    const ms = 350 + (s % 600);
    noise.push(warn(min(s), ss(s), r(), `Slow query: ${q} took ${ms}ms`));
  }

  // Healthcheck slow (~430s)
  r = rotator(1);
  for (let s = 380; s < HOUR_SEC; s += 410 + (s % 29)) {
    const ms = 180 + (s % 220);
    noise.push(warn(min(s), ss(s), r(), `Healthcheck slow: returned in ${ms}ms`));
  }

  // ── ERROR patterns ─────────────────────────────────────────────

  // Connection refused (~480s)
  r = rotator(2);
  for (let s = 320; s < HOUR_SEC; s += 460 + (s % 37)) {
    noise.push(
      err(
        min(s),
        ss(s),
        r(),
        "db connection refused: dial tcp 10.0.0.4:5432: i/o timeout",
      ),
    );
  }

  // Query failed (~540s)
  r = rotator(0);
  for (let s = 380; s < HOUR_SEC; s += 520 + (s % 41)) {
    noise.push(err(min(s), ss(s), r(), "db query failed: context deadline exceeded"));
  }

  // Upstream exhausted (~620s)
  r = rotator(1);
  for (let s = 450; s < HOUR_SEC; s += 590 + (s % 47)) {
    noise.push(err(min(s), ss(s), r(), "upstream pool exhausted, dropping request"));
  }

  // Validation failed (~680s)
  r = rotator(2);
  for (let s = 540; s < HOUR_SEC; s += 650 + (s % 43)) {
    const path = pick(ENDPOINTS, s);
    noise.push(
      err(min(s), ss(s), r(), `POST ${path} 422 in 14ms — validation failed`),
    );
  }

  return noise;
}

const all: PartialLogLine[] = [...STORY, ...generateNoise()].sort(
  (a, b) => a.timestamp - b.timestamp,
);

export const mockLogs: readonly LogLine[] = all.map((line, i) => ({
  id: `log_${String(i + 1).padStart(4, "0")}`,
  ...line,
}));
