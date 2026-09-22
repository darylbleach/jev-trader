import { parseTick } from "../state";
import type { GoldFeedKind, GoldFill, GoldSignal } from "../types";

export interface GoldMeta {
  model: string;
  market: "XAUUSD";
  dryRun: boolean;
  dummyMt5?: boolean;
  startedAt: number;
  feed: GoldFeedKind;
}

export interface GoldHttpTrader {
  history: unknown[];
  snapshot(): Record<string, unknown>;
  signal(): GoldSignal | null;
  onTick(tick: { bid: number; ask: number; volume?: number; ts?: number }): Promise<void>;
  reportFill(fill: GoldFill): GoldFill;
  exportProof?(now?: number): unknown;
  resumeEntries?(): { ok: true; entriesPaused: boolean; realizedUsd: number; pauseReason?: "drawdown" | "floor" | null };
}

export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

export function parseFill(body: unknown): GoldFill | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const ticket = o.ticket;
  const side = o.side === "buy" || o.side === "sell" ? o.side : null;
  const lots = typeof o.lots === "number" ? o.lots : Number(o.lots);
  const price = typeof o.price === "number" ? o.price : Number(o.price);
  if (ticket === undefined || ticket === null || !side || !Number.isFinite(lots) || !Number.isFinite(price)) return null;
  const kind = o.kind === "open" || o.kind === "close" ? o.kind : undefined;
  const reason = o.reason === "signal" || o.reason === "sl" || o.reason === "tp" ? o.reason : undefined;
  const num = (v: unknown): number | undefined => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  };
  return {
    ticket: typeof ticket === "number" || typeof ticket === "string" ? ticket : String(ticket),
    side,
    lots,
    price,
    symbol: typeof o.symbol === "string" ? o.symbol : undefined,
    ts: num(o.ts),
    kind,
    openPrice: num(o.openPrice),
    closePrice: num(o.closePrice),
    sl: num(o.sl),
    tp: num(o.tp),
    reason,
    pnl: num(o.pnl),
    simulated: o.simulated === true ? true : o.simulated === false ? false : undefined,
  };
}

export interface SseHub {
  readonly size: number;
  broadcast(type: string, data: unknown): void;
  subscribe(snapshot: () => unknown): Response;
}

export function createSseHub(): SseHub {
  const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
  const enc = new TextEncoder();
  const send = (c: ReadableStreamDefaultController<Uint8Array>, type: string, data: unknown) => {
    try {
      c.enqueue(enc.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch {
      clients.delete(c);
    }
  };
  return {
    get size() {
      return clients.size;
    },
    broadcast(type: string, data: unknown) {
      for (const c of clients) send(c, type, data);
    },
    subscribe(snapshot: () => unknown): Response {
      let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
      const stream = new ReadableStream<Uint8Array>({
        start(c) {
          controller = c;
          clients.add(c);
          send(c, "snapshot", snapshot());
        },
        cancel() {
          if (controller) clients.delete(controller);
        },
      });
      return new Response(stream, {
        headers: {
          ...CORS,
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
      });
    },
  };
}

export async function handleGoldHttp(
  request: Request,
  trader: GoldHttpTrader,
  meta: GoldMeta,
  hub: SseHub,
): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
  if ((pathname === "/status" || pathname === "/api") && request.method === "GET") {
    return json({ ...trader.snapshot(), ...meta });
  }
  if (pathname === "/history" && request.method === "GET") return json(trader.history);
  if (pathname === "/export" && request.method === "GET") {
    if (typeof trader.exportProof !== "function") return json({ error: "export unavailable" }, 501);
    return json(trader.exportProof(Date.now()));
  }
  if (pathname === "/resume" && request.method === "POST") {
    if (typeof trader.resumeEntries !== "function") return json({ error: "resume unavailable" }, 501);
    return json(trader.resumeEntries());
  }
  if (pathname === "/signal" && request.method === "GET") {
    const latest = trader.signal();
    return latest ? json(latest) : json({ error: "no signal yet" }, 404);
  }
  if (pathname === "/tick" && request.method === "POST") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid json" }, 400);
    }
    const tick = parseTick(body);
    if (!tick) return json({ error: "need bid and ask, or mid/price" }, 400);
    await trader.onTick(tick);
    return json({ ok: true, latest: trader.signal() });
  }
  if (pathname === "/fill" && request.method === "POST") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid json" }, 400);
    }
    const fill = parseFill(body);
    if (!fill) return json({ error: "need ticket, side, lots, price" }, 400);
    return json(trader.reportFill(fill));
  }
  if (pathname === "/events" && request.method === "GET") {
    return hub.subscribe(() => ({ ...trader.snapshot(), ...meta, history: trader.history }));
  }
  return json({ error: "not found" }, 404);
}
