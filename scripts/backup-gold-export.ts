#!/usr/bin/env bun
/**
 * Pre-deploy backup of the live gold demo proof blob.
 *
 * ALWAYS run before any wrangler / MCP / dashboard deploy of jev-gold-demo.
 * Fail closed when /status shows a live book but /export is missing or bad
 * (the pre-persist wipe mode that destroyed overnight Session B and the
 * W32/L21 book session).
 *
 * Usage:
 *   bun run scripts/backup-gold-export.ts
 *   bun run scripts/backup-gold-export.ts --out-dir /path/to/backups
 *   bun run gold:backup
 *
 * Env:
 *   GOLD_DEMO_URL   base URL (default https://jev-gold-demo.darylbleach.workers.dev)
 *   GOLD_BACKUP_DIR output directory (default ./gold-export-backups)
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseProofState } from "../src/gold/proof-state";

const DEFAULT_URL = "https://jev-gold-demo.darylbleach.workers.dev";

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i < 0) return undefined;
  return process.argv[i + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").replace(/Z$/, "Z");
}

function statusHasBook(status: Record<string, unknown>): boolean {
  const wins = typeof status.wins === "number" ? status.wins : 0;
  const losses = typeof status.losses === "number" ? status.losses : 0;
  const realized = typeof status.realizedUsd === "number" ? status.realizedUsd : 0;
  const trades = Array.isArray(status.dummyTrades) ? status.dummyTrades.length : 0;
  const open = status.openTicket != null;
  return wins > 0 || losses > 0 || realized !== 0 || trades > 0 || open;
}

async function fetchJson(url: string): Promise<{ ok: boolean; status: number; body: unknown; text: string }> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body, text };
}

async function main(): Promise<void> {
  const base = (argValue("--url") ?? process.env.GOLD_DEMO_URL ?? DEFAULT_URL).replace(/\/$/, "");
  const outDir = argValue("--out-dir") ?? process.env.GOLD_BACKUP_DIR ?? join(process.cwd(), "gold-export-backups");
  const allowMissingExport = hasFlag("--allow-missing-export");

  mkdirSync(outDir, { recursive: true });
  const ts = stamp();
  const exportPath = join(outDir, `gold-export-${ts}.json`);
  const statusPath = join(outDir, `gold-status-${ts}.json`);
  const metaPath = join(outDir, `gold-backup-meta-${ts}.json`);

  console.log(`Backing up gold proof from ${base}`);

  const statusRes = await fetchJson(`${base}/status`);
  if (!statusRes.ok || !statusRes.body || typeof statusRes.body !== "object") {
    console.error(`FAIL: GET /status returned HTTP ${statusRes.status}. Refusing to continue without a live status check.`);
    process.exit(1);
  }
  writeFileSync(statusPath, JSON.stringify(statusRes.body, null, 2) + "\n");
  const status = statusRes.body as Record<string, unknown>;
  const bookLive = statusHasBook(status);

  const exportRes = await fetchJson(`${base}/export`);
  if (!exportRes.ok) {
    if (bookLive && !allowMissingExport) {
      console.error(
        `FAIL CLOSED: /status shows a live book (wins=${String(status.wins)} losses=${String(status.losses)} ` +
          `realized=${String(status.realizedUsd)} trades=${Array.isArray(status.dummyTrades) ? status.dummyTrades.length : 0}) ` +
          `but GET /export returned HTTP ${exportRes.status}.`,
      );
      console.error(
        "This is the pre-persist wipe path. Do not deploy. Capture /status manually, wait until persist (/export) is live, or restore from an earlier backup.",
      );
      console.error(`Status snapshot saved to ${statusPath}`);
      process.exit(1);
    }
    if (allowMissingExport) {
      console.warn(`WARN: /export HTTP ${exportRes.status}; continuing because --allow-missing-export was set.`);
      writeFileSync(
        metaPath,
        JSON.stringify(
          {
            ok: false,
            reason: "export_missing",
            exportHttp: exportRes.status,
            statusPath,
            bookLive,
            at: new Date().toISOString(),
            url: base,
          },
          null,
          2,
        ) + "\n",
      );
      process.exit(0);
    }
    console.error(`FAIL: GET /export returned HTTP ${exportRes.status}.`);
    process.exit(1);
  }

  const proof = parseProofState(exportRes.body);
  if (!proof) {
    console.error("FAIL CLOSED: /export returned JSON that does not parse as proof version 1.");
    writeFileSync(exportPath + ".raw", exportRes.text + "\n");
    process.exit(1);
  }

  // Fail closed when status shows trades but the proof blob is empty.
  if (bookLive && (!proof.dummy || proof.dummy.trades.length === 0) && !proof.dummy?.open) {
    const statusTrades = Array.isArray(status.dummyTrades) ? status.dummyTrades.length : 0;
    if (statusTrades > 0 || (typeof status.wins === "number" && status.wins > 0) || (typeof status.losses === "number" && status.losses > 0)) {
      console.error("FAIL CLOSED: /status has book activity but /export proof has no dummy trades or open ticket.");
      console.error("Refusing to treat this as a successful backup. Inspect the Worker before any deploy.");
      writeFileSync(exportPath, JSON.stringify(exportRes.body, null, 2) + "\n");
      process.exit(1);
    }
  }

  writeFileSync(exportPath, JSON.stringify(exportRes.body, null, 2) + "\n");
  const meta = {
    ok: true,
    at: new Date().toISOString(),
    url: base,
    exportPath,
    statusPath,
    version: proof.version,
    startedAt: proof.startedAt,
    seq: proof.seq,
    wins: proof.dummy?.wins ?? null,
    losses: proof.dummy?.losses ?? null,
    realized: proof.dummy?.realized ?? null,
    trades: proof.dummy?.trades.length ?? 0,
    open: proof.dummy?.open != null,
    statusWins: status.wins ?? null,
    statusLosses: status.losses ?? null,
    statusRealizedUsd: status.realizedUsd ?? null,
  };
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");

  console.log(
    `OK backup: trades=${meta.trades} W${meta.wins}/L${meta.losses} realized=${meta.realized} → ${exportPath}`,
  );
  console.log(`Also wrote ${statusPath}`);
  console.log(`Meta ${metaPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
