type GoldAction = "buy" | "sell" | "hold";

interface GoldSignal {
  ts: number;
  seq: number;
  mid: number;
  bid: number;
  ask: number;
  spreadPips: number;
  action: GoldAction;
  probabilities: Record<GoldAction, number>;
  latencyMs: number;
  late: boolean;
  sim: boolean;
  lot: number;
  slPoints?: number;
  tpPoints?: number;
  position: "buy" | "sell" | "flat";
}

interface DummyPnL {
  realizedUsd: number;
  unrealizedUsd: number;
  totalUsd: number;
  wins: number;
  losses: number;
}

interface GoldEvent {
  ts: number;
  mid: number;
  bid: number;
  ask: number;
  decision: GoldSignal | null;
  fill?: GoldFill | null;
  late: boolean;
  pnl?: DummyPnL;
  lastTicket?: DummyTrade | null;
}

interface DummyTicket {
  ticket: number;
  side: "buy" | "sell";
  lots: number;
  openPrice: number;
  sl: number;
  tp: number;
  openTs: number;
}

interface DummyTrade {
  ticket: number;
  side: "buy" | "sell";
  lots: number;
  openPrice: number;
  sl: number;
  tp: number;
  closePrice: number;
  reason: "signal" | "sl" | "tp";
  pnl: number;
  openTs: number;
  closeTs: number;
}

interface GoldFill {
  ticket: number | string;
  side: "buy" | "sell";
  lots: number;
  price: number;
  kind?: "open" | "close";
  openPrice?: number;
  closePrice?: number;
  sl?: number;
  tp?: number;
  reason?: "signal" | "sl" | "tp";
  pnl?: number;
  simulated?: boolean;
  ts?: number;
}

interface Snapshot {
  model: string;
  market: "XAUUSD";
  dryRun: boolean;
  dummyMt5?: boolean;
  feed?: string;
  latest: GoldSignal | null;
  horizonMs?: number;
  totals: {
    ticks: number;
    decisions: number;
    lateTicks: number;
    fills: number;
    jevUsd: number;
    realizedUsd?: number;
    unrealizedUsd?: number;
    pnlUsd?: number;
    wins?: number;
    losses?: number;
  };
  error?: string | null;
  history?: GoldEvent[];
  realizedUsd?: number;
  unrealizedUsd?: number;
  pnlUsd?: number;
  wins?: number;
  losses?: number;
  lastTicket?: DummyTrade | null;
  openTicket?: DummyTicket | null;
  dummyTrades?: DummyTrade[];
  dummyPnl?: {
    realized?: number;
    floating?: number;
    total?: number;
    realizedUsd?: number;
    unrealizedUsd?: number;
    totalUsd?: number;
    wins?: number;
    losses?: number;
  };
}

const $ = (id: string) => document.getElementById(id);

const mids: number[] = [];
const tape: GoldSignal[] = [];
const dummyTape: DummyTrade[] = [];
const seenFills = new Set<string>();
let latest: GoldSignal | null = null;
let horizonMs: number | null = null;
let latestMid = 0;
let dummyEnabled = true;
let openTicket: DummyTicket | null = null;
let lastTicket: DummyTrade | null = null;
let dummyPnl = { realized: 0, floating: 0, wins: 0, losses: 0 };
let totals = { ticks: 0, decisions: 0, lateTicks: 0, fills: 0, jevUsd: 0 };

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function applySnapshot(s: Snapshot): void {
  const model = $("model");
  if (model) {
    model.textContent = s.model;
    const jev = s.model.toLowerCase().startsWith("jev");
    model.className = `badge ${jev ? "jev" : "standin"}`;
  }
  const feed = $("feed");
  if (feed) feed.textContent = s.feed ?? (s.dryRun ? "demo" : "live");
  if (typeof s.horizonMs === "number" && s.horizonMs > 0) horizonMs = s.horizonMs;
  if (s.totals) totals = s.totals;
  dummyEnabled = s.dummyMt5 !== false;
  if (s.openTicket !== undefined) openTicket = s.openTicket;
  if (s.dummyTrades) {
    dummyTape.length = 0;
    dummyTape.push(...s.dummyTrades);
    lastTicket = dummyTape.at(-1) ?? null;
    seenFills.clear();
    for (const t of dummyTape) {
      seenFills.add(`${t.ticket}|close|${t.closePrice}|${t.reason}|${t.closeTs}`);
    }
  }
  if (s.lastTicket !== undefined) lastTicket = s.lastTicket;
  if (s.dummyPnl || typeof s.realizedUsd === "number") {
    dummyPnl = {
      realized: s.dummyPnl?.realized ?? s.dummyPnl?.realizedUsd ?? s.realizedUsd ?? s.totals?.realizedUsd ?? 0,
      floating: s.dummyPnl?.floating ?? s.dummyPnl?.unrealizedUsd ?? s.unrealizedUsd ?? s.totals?.unrealizedUsd ?? 0,
      wins: s.dummyPnl?.wins ?? s.wins ?? s.totals?.wins ?? dummyTape.filter((t) => t.pnl > 0).length,
      losses: s.dummyPnl?.losses ?? s.losses ?? s.totals?.losses ?? dummyTape.filter((t) => t.pnl < 0).length,
    };
  }
  if (s.history) {
    for (const e of s.history) {
      mids.push(e.mid);
      latestMid = e.mid;
      if (e.decision && !e.late && !e.fill) tape.push(e.decision);
    }
    if (mids.length > 240) mids.splice(0, mids.length - 240);
    if (tape.length > 12) tape.splice(0, tape.length - 12);
  }
  if (s.latest) {
    latestMid = s.latest.mid;
    renderSignal(s.latest);
  }
  const err = $("offline");
  if (err) err.textContent = s.error ? s.error : "";
  renderStats();
  renderDummy();
  drawChart();
}

function renderSignal(s: GoldSignal): void {
  latest = s;
  const mid = $("mid");
  if (mid) mid.textContent = s.mid.toFixed(2);
  const seq = $("seq");
  if (seq) seq.textContent = `seq ${s.seq}`;
  const pos = $("pos");
  if (pos) {
    pos.textContent = s.position;
    pos.className = `pos ${s.position}`;
  }
  const chosen = s.late || s.action === "hold" ? null : s.action;
  const headline = $("headline");
  if (headline) {
    headline.textContent = chosen ? `${chosen.toUpperCase()} ${pct(s.probabilities[chosen])}` : "LATE";
    headline.className = `headline ${chosen ?? "late"}`;
  }
  const buyFill = $("buyFill");
  const sellFill = $("sellFill");
  const buyPct = $("buyPct");
  const sellPct = $("sellPct");
  if (buyFill) buyFill.style.width = `${Math.max(0, Math.min(1, s.probabilities.buy)) * 100}%`;
  if (sellFill) sellFill.style.width = `${Math.max(0, Math.min(1, s.probabilities.sell)) * 100}%`;
  if (buyPct) buyPct.textContent = chosen ? pct(s.probabilities.buy) : "-";
  if (sellPct) sellPct.textContent = chosen ? pct(s.probabilities.sell) : "-";
  const latency = $("latency");
  if (latency) latency.textContent = s.late ? "late  held" : `${s.latencyMs.toFixed(0)} ms${s.sim ? "  sim" : ""}`;
}

function renderStats(): void {
  const el = $("stats");
  if (!el) return;
  const cells = [
    ["TICKS", String(totals.ticks)],
    ["DECISIONS", String(totals.decisions)],
    ["LATE", String(totals.lateTicks)],
    ["FILLS", String(totals.fills)],
    ["JEV USD", totals.jevUsd.toFixed(4)],
    ["HORIZON", horizonMs ? `${horizonMs / 1000}s` : "-"],
    ["SPREAD", latest ? `${latest.spreadPips.toFixed(1)} pips` : "-"],
    ["WINS", String(dummyPnl.wins)],
    ["LOSSES", String(dummyPnl.losses)],
  ];
  el.innerHTML = cells.map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
}

function money(n: number): string {
  const abs = Math.abs(n).toFixed(2);
  if (n > 0) return `+$${abs}`;
  if (n < 0) return `-$${abs}`;
  return "$0.00";
}

function tone(n: number): string {
  return n > 0 ? "up" : n < 0 ? "down" : "";
}

function closeVerb(reason: DummyTrade["reason"]): string {
  switch (reason) {
    case "sl":
      return "SL";
    case "tp":
      return "TP";
    case "signal":
      return "CLOSE";
    default: {
      const _never: never = reason;
      return _never;
    }
  }
}

function applyPnL(p: DummyPnL): void {
  dummyPnl.realized = p.realizedUsd;
  dummyPnl.floating = p.unrealizedUsd;
  dummyPnl.wins = p.wins;
  dummyPnl.losses = p.losses;
}

function renderPnL(): void {
  const band = $("pnlBand");
  if (band) band.style.display = dummyEnabled ? "" : "none";
  const realized = dummyPnl.realized;
  const open = dummyPnl.floating;
  const total = realized + open;
  const realizedEl = $("pnlRealized");
  if (realizedEl) {
    realizedEl.textContent = money(realized);
    realizedEl.className = `pnl-v ${tone(realized)}`;
  }
  const openEl = $("pnlOpen");
  if (openEl) {
    openEl.textContent = money(open);
    openEl.className = `pnl-v ${tone(open)}`;
  }
  const totalEl = $("pnlTotal");
  if (totalEl) {
    totalEl.textContent = money(total);
    totalEl.className = `pnl-v ${tone(total)}`;
  }
  const lastEl = $("lastTicket");
  if (lastEl) {
    if (lastTicket) {
      lastEl.textContent = `last ticket #${lastTicket.ticket} ${lastTicket.side.toUpperCase()} ${closeVerb(lastTicket.reason)} ${money(lastTicket.pnl)}`;
      lastEl.className = `last-ticket ${tone(lastTicket.pnl)}`;
    } else if (openTicket) {
      lastEl.textContent = `open ticket #${openTicket.ticket} ${openTicket.side.toUpperCase()} ${money(dummyPnl.floating)}`;
      lastEl.className = `last-ticket ${tone(dummyPnl.floating)}`;
    } else {
      lastEl.textContent = "no dummy result yet";
      lastEl.className = "last-ticket";
    }
  }
}

function renderDummy(): void {
  const panel = $("dummyPanel");
  if (panel) panel.style.display = dummyEnabled ? "" : "none";
  const note = $("dummyNote");
  if (note) {
    note.textContent = dummyEnabled
      ? "Simulated tickets. Not a live broker. Shows what JevLeader would open and close on XAUUSD, with profit or loss on every close."
      : "Dummy MT5 is off. Attach the real EAs to see broker fills.";
  }
  const record = $("dummyRecord");
  if (record) record.textContent = `W ${dummyPnl.wins}  L ${dummyPnl.losses}`;
  const open = $("dummyOpen");
  if (open) {
    if (!openTicket) {
      open.textContent = dummyTape.length ? "no open ticket" : "waiting for first ticket";
      open.className = "dummy-open";
    } else {
      const t = openTicket;
      open.innerHTML = `<span class="${t.side}">${t.side.toUpperCase()} in</span> #${t.ticket}  ${t.lots} lot @ ${t.openPrice.toFixed(2)}  SL ${t.sl.toFixed(2)}  TP ${t.tp.toFixed(2)}  open ${money(dummyPnl.floating)}`;
      open.className = `dummy-open ${t.side}`;
    }
  }
  const tapeEl = $("dummyTape");
  if (tapeEl) {
    const rows = [...dummyTape].reverse().slice(0, 16).map((t) => {
      const verb = closeVerb(t.reason);
      return `<div class="row"><span class="t-id">#${t.ticket}</span><span class="t-side ${t.side}">${t.side.toUpperCase()} in</span><span class="t-open">${t.openPrice.toFixed(2)}</span><span class="t-close ${t.reason}">${verb} ${t.closePrice.toFixed(2)}</span><span class="t-pnl ${tone(t.pnl)}">${money(t.pnl)}</span></div>`;
    });
    tapeEl.innerHTML = rows.join("") || `<div class="row empty"><span class="t-open">no dummy trades yet</span></div>`;
  }
  renderPnL();
}

function fillKey(f: GoldFill): string {
  return `${f.ticket}|${f.kind ?? ""}|${f.price}|${f.reason ?? ""}|${f.ts ?? ""}`;
}

function onFill(f: GoldFill): void {
  const key = fillKey(f);
  if (seenFills.has(key)) return;
  seenFills.add(key);
  totals.fills += 1;
  if (f.kind === "open") {
    openTicket = {
      ticket: typeof f.ticket === "number" ? f.ticket : Number(f.ticket),
      side: f.side,
      lots: f.lots,
      openPrice: f.openPrice ?? f.price,
      sl: f.sl ?? 0,
      tp: f.tp ?? 0,
      openTs: f.ts ?? Date.now(),
    };
  } else if (f.kind === "close" || f.reason) {
    const trade: DummyTrade = {
      ticket: typeof f.ticket === "number" ? f.ticket : Number(f.ticket),
      side: f.side,
      lots: f.lots,
      openPrice: f.openPrice ?? openTicket?.openPrice ?? f.price,
      sl: f.sl ?? openTicket?.sl ?? 0,
      tp: f.tp ?? openTicket?.tp ?? 0,
      closePrice: f.closePrice ?? f.price,
      reason: f.reason ?? "signal",
      pnl: f.pnl ?? 0,
      openTs: openTicket?.openTs ?? f.ts ?? Date.now(),
      closeTs: f.ts ?? Date.now(),
    };
    dummyTape.push(trade);
    if (dummyTape.length > 40) dummyTape.shift();
    dummyPnl.realized = dummyTape.reduce((sum, row) => sum + row.pnl, 0);
    dummyPnl.wins = dummyTape.filter((row) => row.pnl > 0).length;
    dummyPnl.losses = dummyTape.filter((row) => row.pnl < 0).length;
    dummyPnl.floating = 0;
    lastTicket = trade;
    openTicket = null;
  }
  if (openTicket && latestMid) {
    const dir = openTicket.side === "buy" ? 1 : -1;
    dummyPnl.floating = (latestMid - openTicket.openPrice) * dir * 100 * openTicket.lots;
  }
  renderDummy();
  renderStats();
}

function renderTape(): void {
  const el = $("tape");
  if (!el) return;
  const rows = [...tape].reverse().slice(0, 12);
  el.innerHTML = rows.map((s) => (
    `<div class="row"><span>${s.seq}</span><span class="${s.action}">${s.action}</span><span>${s.mid.toFixed(2)}</span><span>${s.latencyMs.toFixed(0)}ms</span></div>`
  )).join("");
}

function drawChart(): void {
  const canvas = $("chart") as HTMLCanvasElement | null;
  if (!canvas || mids.length < 2) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const lo = Math.min(...mids);
  const hi = Math.max(...mids);
  const span = Math.max(0.2, hi - lo);
  const pad = 12;
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  mids.forEach((p, i) => {
    const x = pad + (i / (mids.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p - lo) / span) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function onEvent(e: GoldEvent): void {
  mids.push(e.mid);
  latestMid = e.mid;
  if (mids.length > 240) mids.shift();
  if (!e.fill) totals.ticks += 1;
  if (e.late) totals.lateTicks += 1;
  if (e.decision && !e.late && !e.fill) {
    totals.decisions += 1;
    tape.push(e.decision);
    if (tape.length > 24) tape.shift();
    renderSignal(e.decision);
    renderTape();
  }
  if (e.fill) onFill(e.fill);
  else if (e.pnl) {
    applyPnL(e.pnl);
    if (e.lastTicket !== undefined) lastTicket = e.lastTicket;
    renderDummy();
  } else if (openTicket) {
    const dir = openTicket.side === "buy" ? 1 : -1;
    dummyPnl.floating = (e.mid - openTicket.openPrice) * dir * 100 * openTicket.lots;
    renderDummy();
  }
  const mid = $("mid");
  if (mid && !e.decision) mid.textContent = e.mid.toFixed(2);
  renderStats();
  drawChart();
}

function connect(): void {
  const es = new EventSource("/events");
  const offline = $("offline");
  es.addEventListener("snapshot", (ev) => {
    if (offline) offline.textContent = "";
    applySnapshot(JSON.parse((ev as MessageEvent).data) as Snapshot);
    renderTape();
  });
  es.addEventListener("tick", (ev) => onEvent(JSON.parse((ev as MessageEvent).data) as GoldEvent));
  es.addEventListener("late", (ev) => onEvent(JSON.parse((ev as MessageEvent).data) as GoldEvent));
  es.addEventListener("fill", (ev) => {
    const data = JSON.parse((ev as MessageEvent).data) as GoldEvent | GoldFill;
    if (data && typeof data === "object" && "fill" in data && data.fill) {
      latestMid = typeof data.mid === "number" ? data.mid : latestMid;
      if (data.pnl) applyPnL(data.pnl);
      if (data.lastTicket !== undefined) lastTicket = data.lastTicket;
      onFill(data.fill);
      return;
    }
    if (data && typeof data === "object" && "ticket" in data && "side" in data) onFill(data as GoldFill);
  });
  es.addEventListener("signal", (ev) => {
    const s = JSON.parse((ev as MessageEvent).data) as GoldSignal;
    renderSignal(s);
    renderStats();
  });
  es.onerror = () => {
    if (offline) offline.textContent = "reconnecting";
  };
}

connect();
window.addEventListener("resize", drawChart);
