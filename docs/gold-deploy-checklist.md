# Gold demo deploy checklist

Use this every time you publish `jev-gold-demo`. Skipping backup is how overnight Session B (+$24 / 232) and the later book session (W32/L21/-$10) were wiped.

## Hard rules

1. **Backup first.** `GET /export` must succeed and be saved to a timestamped file **before** any deploy.
2. Prefer Project store paths: `docs/backups/gold-export-<UTC>.json` and/or `media/backups/`.
3. **Fail closed** if `/status` shows wins, losses, realized P/L, open ticket, or `dummyTrades`, but `/export` is 404 / unreadable.
4. Never rename `GoldRoom`, never change DO name `xauusd-jev`, never `storage.deleteAll()`.
5. Do not attach MT5 to this Worker. Do not touch the Kuru tweet path.
6. Prefer `bun run gold:deploy` (or `gold:cf`). Do not use bare `wrangler deploy`, Cloudflare dashboard "Quick edit", or MCP worker updates against a live book.

## Commands

```bash
export PATH="$HOME/.bun/bin:$PATH"
# Project store backup (example):
export GOLD_BACKUP_DIR="/cursor/stores/<project>/docs/backups"

bun install
bun run gold:backup          # curls /export + /status; fail closed if needed
# Inspect the JSON: trades, wins, losses, realized must look right.

bun run gold:deploy          # backup again → prepare-gold-cf → wrangler deploy
```

After deploy:

```bash
curl -sS https://jev-gold-demo.darylbleach.workers.dev/export | jq '{wins:.dummy.wins,losses:.dummy.losses,realized:.dummy.realized,trades:(.dummy.trades|length),startedAt}'
curl -sS https://jev-gold-demo.darylbleach.workers.dev/status | jq '{wins,losses,realizedUsd,dummyTrades:(.dummyTrades|length),startedAt,fillMode,tpPoints,slPoints}'
```

`startedAt`, closed-trade count, and realized P/L must match the pre-deploy backup (new closes after deploy are fine; a reset to zero is a wipe).

## Pre-persist → persist (one-time)

When upgrading a Worker that has **in-memory** trades but no `/export` yet:

| `/status` book | `/export` | Action |
| --- | --- | --- |
| Empty | 404 or 200 empty | Safe to deploy persist for the first time |
| Has trades | 404 | **Refuse deploy.** Capture `/status` JSON manually. You cannot restore a full proof blob from status alone. Accept the wipe only with explicit human sign-off, or wait until you can ship persist without restarting this DO (not available via normal wrangler). |
| Has trades | 200 with matching proof | Backup, then deploy |

`bun run gold:backup` already fails closed on the dangerous row. Do not set `GOLD_ALLOW_UNSAFE_DEPLOY=1` on the public demo.

## Escape hatches (dangerous)

- `GOLD_ALLOW_UNSAFE_DEPLOY=1` or `bun run scripts/gold-deploy.ts --unsafe-no-backup` skips backup. Only for empty local preview Workers.
- `--allow-missing-export` on the backup script alone: still do not deploy a live book without export.

## Related

- Incident: Project store `docs/proof-wipe-incident.md`
- Persist design: Project store `docs/trade-history-persistence.md`
- Boot harden: `src/gold/cf/proof-boot.ts` (refuse empty boot when `proof` key is corrupt)
