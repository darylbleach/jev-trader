#!/usr/bin/env bun
/**
 * Safe gold demo deploy: backup /export (fail closed) → prepare → wrangler deploy.
 *
 * Never use bare `wrangler deploy` against jev-gold-demo. That path wiped
 * in-memory book sessions when persist was not live, and can still lose tape
 * if DO class/name migrations clear storage.
 *
 * Usage:
 *   bun run gold:deploy
 *   bun run scripts/gold-deploy.ts --out-dir /path/to/project-store/docs/backups
 *
 * One-time pre-persist → persist migration:
 *   If /export 404s while /status shows trades, backup-gold-export fails closed.
 *   Do not force a deploy. Ship persist first only to an empty room, or restore
 *   from a captured status tape after the fact (status alone is not a full proof blob).
 *
 * Escape hatch (dangerous): GOLD_ALLOW_UNSAFE_DEPLOY=1 skips backup. Do not use
 * on the public demo while a book tape exists.
 */

import { spawnSync } from "node:child_process";
import { join } from "node:path";

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i < 0) return undefined;
  return process.argv[i + 1];
}

function run(cmd: string, args: string[], env?: NodeJS.ProcessEnv): void {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    env: env ?? process.env,
    cwd: process.cwd(),
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

const unsafe = process.env.GOLD_ALLOW_UNSAFE_DEPLOY === "1" || process.argv.includes("--unsafe-no-backup");
const outDir = argValue("--out-dir") ?? process.env.GOLD_BACKUP_DIR;

if (unsafe) {
  console.warn("WARNING: skipping /export backup (GOLD_ALLOW_UNSAFE_DEPLOY or --unsafe-no-backup).");
  console.warn("This can wipe live proof if persist is missing or DO storage is reset.");
} else {
  const backupArgs = ["run", join("scripts", "backup-gold-export.ts")];
  if (outDir) {
    backupArgs.push("--out-dir", outDir);
  }
  const url = argValue("--url");
  if (url) backupArgs.push("--url", url);
  run("bun", backupArgs);
}

run("bun", ["run", join("scripts", "prepare-gold-cf.ts")]);
run("bunx", ["wrangler", "deploy"]);

console.log("Deploy finished. Re-check /export matches the pre-deploy backup trade count.");
console.log("  curl -sS https://jev-gold-demo.darylbleach.workers.dev/export | head");
