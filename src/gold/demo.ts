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
  position: "buy" | "sell" | "flat";
}

interface GoldEvent {
  ts: number;
  mid: number;
  bid: number;
  ask: number;
  decision: GoldSignal | null;
  late: boolean;
}

interface Snapshot {
  model: string;
  market: "XAUUSD";
  dryRun: boolean;
  feed?: string;
  latest: GoldSignal | null;
  totals: { ticks: number; decisions: number; lateTicks: number; fills: number; jevUsd: number };
  error?: string | null;
  history?: GoldEvent[];
}

const $ = (id: string) => document.getElementById(id);

const mids: number[] = [];
const tape: GoldSignal[] = [];
let latest: GoldSignal | null = null;
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
  if (s.totals) totals = s.totals;
  if (s.history) {
    for (const e of s.history) {
      mids.push(e.mid);
      if (e.decision && !e.late) tape.push(e.decision);
    }
    if (mids.length > 240) mids.splice(0, mids.length - 240);
    if (tape.length > 12) tape.splice(0, tape.length - 12);
  }
  if (s.latest) renderSignal(s.latest);
  const err = $("offline");
  if (err) err.textContent = s.error ? s.error : "";
  renderStats();
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
    ["SPREAD", latest ? `${latest.spreadPips.toFixed(1)} pips` : "-"],
  ];
  el.innerHTML = cells.map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");
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
  if (mids.length > 240) mids.shift();
  totals.ticks += 1;
  if (e.late) totals.lateTicks += 1;
  if (e.decision && !e.late) {
    totals.decisions += 1;
    tape.push(e.decision);
    if (tape.length > 24) tape.shift();
    renderSignal(e.decision);
    renderTape();
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
