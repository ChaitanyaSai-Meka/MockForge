import type { Database, Json } from "@/lib/database.types";

export type RequestLogInput =
  Database["public"]["Tables"]["request_logs"]["Insert"];
export type LogScheduler = (task: () => Promise<void>) => void;

// A denylist cannot recognize secrets hidden under arbitrary query names.
// Keep only tightly typed, useful pagination metadata; never store free text.
export function safeQueryParams(url: string): Record<string, Json> {
  const query = new URL(url).searchParams;
  const result: Record<string, Json> = {};
  for (const key of ["page", "limit", "offset"]) {
    const values = query.getAll(key);
    if (values.length === 1 && /^(0|[1-9]\d{0,6})$/.test(values[0])) {
      result[key] = values[0];
    }
  }
  const orders = query.getAll("order");
  if (orders.length === 1 && /^(asc|desc)$/.test(orders[0]))
    result.order = orders[0];
  return result;
}

export function requestDuration(started: number, ended: number): number {
  const elapsed = ended - started;
  return Number.isFinite(elapsed)
    ? Math.min(3_600_000, Math.max(0, Math.round(elapsed)))
    : 0;
}

export async function recordRequest(
  write: (entry: RequestLogInput) => Promise<void>,
  entry: RequestLogInput,
  schedule?: LogScheduler,
  reportFailure: () => void = () =>
    console.error("MockForge request logging failed."),
) {
  const report = () => {
    // Diagnostics must not become a second failure on the response path.
    try {
      reportFailure();
    } catch {
      /* Keep the configured response. */
    }
  };
  const task = async () => {
    try {
      await write(entry);
    } catch {
      report();
    }
  };
  try {
    if (schedule) schedule(task);
    else await task();
  } catch {
    report();
  }
}
