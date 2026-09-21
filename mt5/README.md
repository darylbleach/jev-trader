# Jev XAUUSD copy trader (MT5)

Separate from the Monad/Kuru demo. A Bun process decides buy or sell on XAUUSD. These Expert Advisors only talk HTTP to that process and place market orders on your broker.

This is a broker CFD, not an on-chain Kuru market. Experimental, small size, not financial advice.

## 1. Start the gold server

From the repo root (does not start the Kuru bot):

    bun run gold

Default bind is `http://127.0.0.1:3001`. Open `/` or `/demo` for the live XAUUSD page. Dry-run is on unless you set `GOLD_DRY_RUN=false`. Jev still answers either way. `GOLD_MODEL=mock` is the stand-in; `GOLD_MODEL=jev` plus `TYPESAFE_AI_API_KEY` uses Jev.

Post a tick yourself if no EA is attached:

    curl -s -X POST http://127.0.0.1:3001/tick -H 'content-type: application/json' -d '{"bid":2650.10,"ask":2650.40}'
    curl -s http://127.0.0.1:3001/signal

## 2. Allow WebRequest in MT5

1. Copy `JevHttp.mqh`, `JevLeader.mq5`, and `JevFollower.mq5` into `MQL5/Experts/Jev/` (the `.mqh` must sit next to the EAs).
2. Compile both EAs in MetaEditor. This repo does not ship `.ex5` files.
3. Tools, Options, Expert Advisors: enable "Allow WebRequest for listed URL" and add the gold server origin, for example `http://127.0.0.1:3001`. If the server is on another host, add that origin. No path.

The EAs fail closed on HTTP errors, a stale `ts` (older than `InpMaxAgeMs`), or a spread above the cap.

## 3. Leader

Attach `JevLeader` to an XAUUSD / GOLD / XAUUSDm chart on the account that should trade first.

- `InpServer` gold server origin
- `InpSymbol` `XAUUSD` (falls back to `GOLD`, `XAUUSDm`, and a few suffixes)
- `InpLot` used if the signal lot is missing
- `InpSlippage`, `InpMagic`, optional `InpSLPoints` / `InpTPPoints`
- `InpMaxSpreadPips`, `InpMaxAgeMs`

Every ~200 ms it POSTs bid/ask to `/tick` and GETs `/signal`. On a new `seq` it opens, reverses, or flattens to match `position`. After a fill it POSTs `/fill`.

## 4. Followers

Attach `JevFollower` to the same symbol on each follower account. It only GETs `/signal`. It does not call Jev.

Lot math (same as `scaleLots` in `src/gold/policy.ts`):

    lot = InpLotMult * signal.lot * (AccountEquity / InpLeaderEquity)

Then round down to the broker lot step and clamp to `InpMinLot` / `InpMaxLot`. If that rounds below min lot, the EA does not open.

Set `InpLeaderEquity` to the leader account equity you want to scale against. Set `InpLotMult` to 1 to copy proportional to equity.

## 5. Notes

- Followers copy the signal, not the leader ticket stream. Fills will not match tick for tick.
- Netting-style: one side at a time. Opposite signal closes then opens when `GOLD_REVERSE=true` (default).
- Do not attach these EAs to the Kuru dashboard process. `bun run start` stays MON-USDC on Monad.
