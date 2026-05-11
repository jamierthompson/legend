import type { LogLine } from "@/types/log";

const ANCHOR = new Date("2026-05-11T13:00:00Z").getTime();
const t = (seconds: number): number => ANCHOR + seconds * 1000;

export const mockLogs: readonly LogLine[] = [
  { id: "log_0001", timestamp: t(0),   instance: "kc4qn", level: "INFO",  message: "Server listening on port 3000" },
  { id: "log_0002", timestamp: t(8),   instance: "m7w3p", level: "INFO",  message: "Healthcheck OK" },
  { id: "log_0003", timestamp: t(19),  instance: "kc4qn", level: "DEBUG", message: "Connection pool: 3/20 active" },
  { id: "log_0004", timestamp: t(31),  instance: "t2x8r", level: "INFO",  message: "Cache warmed (12 keys)" },
  { id: "log_0005", timestamp: t(44),  instance: "m7w3p", level: "INFO",  message: "Heartbeat sent" },
  { id: "log_0006", timestamp: t(58),  instance: "kc4qn", level: "WARN",  message: "Slow upstream: api.stripe.com responded in 678ms" },
  { id: "log_0007", timestamp: t(72),  instance: "t2x8r", level: "INFO",  message: "GET /api/orders 200 in 51ms" },
  { id: "log_0008", timestamp: t(89),  instance: "kc4qn", level: "ERROR", message: "db query failed: pq: too many connections" },
  { id: "log_0009", timestamp: t(101), instance: "m7w3p", level: "INFO",  message: "POST /api/sessions 201 in 64ms" },
  { id: "log_0010", timestamp: t(116), instance: "kc4qn", level: "INFO",  message: "GET /api/users 200 in 38ms" },
  { id: "log_0011", timestamp: t(133), instance: "t2x8r", level: "DEBUG", message: "GC paused 14ms" },
  { id: "log_0012", timestamp: t(148), instance: "m7w3p", level: "WARN",  message: "Cache miss rate elevated: 0.36" },
  { id: "log_0013", timestamp: t(162), instance: "kc4qn", level: "INFO",  message: "Background job completed in 47ms" },
  { id: "log_0014", timestamp: t(177), instance: "t2x8r", level: "INFO",  message: "Healthcheck OK" },
  { id: "log_0015", timestamp: t(193), instance: "kc4qn", level: "INFO",  message: "GET /api/products 200 in 33ms" },
  { id: "log_0016", timestamp: t(208), instance: "m7w3p", level: "ERROR", message: "request timeout after 30000ms" },
  { id: "log_0017", timestamp: t(224), instance: "t2x8r", level: "INFO",  message: "PATCH /api/orders/42 200 in 72ms" },
  { id: "log_0018", timestamp: t(241), instance: "kc4qn", level: "INFO",  message: "Heartbeat sent" },
];
