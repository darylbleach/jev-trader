import demoPage from "./demo.html";
import { goldConfig } from "./config";
import { parseTick } from "./state";
import type { GoldTrader } from "./trader";
import type { GoldEvent, GoldFill, GoldSignal } from "./types";

interface Meta {
  model: string;
  market: "XAUUSD";
  dryRun: boolean;
  startedAt: number;
  feed: "demo" | "url" | "idle";
}

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });

export function startGoldServer(trader: GoldTrader, meta: Meta) {
  const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
  const enc = new TextEncoder();
  const send = (c: ReadableStreamDefaultController<Uint8Array>, type: string, data: unknown) => {
    try { c.enqueue(enc.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { clients.delete(c); }
  };
  const ping = setInterval(() => clients.forEach((c) => send(c, "ping", Date.now())), 15_000);

  const server = Bun.serve({
    port: goldConfig.port,
    routes: {
      "/": demoPage,
      "/demo": demoPage,
    },
    async fetch(req) {
      const { pathname } = new URL(req.url);
      if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
      if ((pathname === "/status" || pathname === "/api") && req.method === "GET") return json({ ...trader.snapshot(), ...meta });
      if (pathname === "/history" && req.method === "GET") return json(trader.history);
      if (pathname === "/signal" && req.method === "GET") {
        const latest = trader.signal();
        return latest ? json(latest) : json({ error: "no signal yet" }, 404);
      }
      if (pathname === "/tick" && req.method === "POST") {
        let body: unknown;
        try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
        const tick = parseTick(body);
        if (!tick) return json({ error: "need bid and ask, or mid/price" }, 400);
        await trader.onTick(tick);
        return json({ ok: true, latest: trader.signal() });
      }
      if (pathname === "/fill" && req.method === "POST") {
        let body: unknown;
        try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
        const fill = parseFill(body);
        if (!fill) return json({ error: "need ticket, side, lots, price" }, 400);
        return json(trader.reportFill(fill));
      }
      if (pathname === "/events" && req.method === "GET") {
        const stream = new ReadableStream<Uint8Array>({
          start(c) { clients.add(c); send(c, "snapshot", { ...trader.snapshot(), ...meta, history: trader.history }); },
          cancel(c) { clients.delete(c); },
        });
        return new Response(stream, { headers: { ...CORS, "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" } });
      }
      return json({ error: "not found" }, 404);
    },
  });

  const broadcast = (type: string, data: unknown) => clients.forEach((c) => send(c, type, data));
  return {
    port: server.port,
    broadcast: (e: GoldEvent) => broadcast(e.fill ? "fill" : e.late ? "late" : "tick", e),
    broadcastSignal: (s: GoldSignal) => broadcast("signal", s),
    broadcastFill: (f: GoldFill) => broadcast("fill", f),
    stop: () => {
      clearInterval(ping);
      server.stop(true);
    },
  };
}

function parseFill(body: unknown): GoldFill | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const ticket = o.ticket;
  const side = o.side === "buy" || o.side === "sell" ? o.side : null;
  const lots = typeof o.lots === "number" ? o.lots : Number(o.lots);
  const price = typeof o.price === "number" ? o.price : Number(o.price);
  if (ticket === undefined || ticket === null || !side || !Number.isFinite(lots) || !Number.isFinite(price)) return null;
  return {
    ticket: typeof ticket === "number" || typeof ticket === "string" ? ticket : String(ticket),
    side,
    lots,
    price,
    symbol: typeof o.symbol === "string" ? o.symbol : undefined,
    ts: typeof o.ts === "number" ? o.ts : undefined,
  };
}
