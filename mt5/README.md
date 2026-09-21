# Jev XAUUSD copy trader (MT5)

Separate from the Monad/Kuru demo. A Bun process decides buy or sell on XAUUSD as a small in-out scalp, not a swing hold. These Expert Advisors only talk HTTP to that process and place market orders on your broker.

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
- `InpSlippage`, `InpMagic`
- `InpSLPoints` / `InpTPPoints` (defaults 600 / 800). Every new market order always gets both. If an input is 0, the EA uses `slPoints` / `tpPoints` from `/signal`, then the same hardcoded defaults. Distances are raised to `SYMBOL_TRADE_STOPS_LEVEL` so the broker does not reject the order.
- `InpMaxSpreadPips`, `InpMaxAgeMs`

Every ~200 ms it POSTs bid/ask to `/tick` and GETs `/signal`. On a new `seq` it opens, reverses, or flattens to match `position`. After a fill it POSTs `/fill`.

On a 2-decimal gold quote (`SYMBOL_POINT` 0.01) those defaults are $6 stop loss and $8 take profit. That is a tight scalp exit, well above a typical ~15 pip / $0.15 spread, not a hold for one large gold move. Change `GOLD_SL_POINTS` / `GOLD_TP_POINTS` on the server (those values ride on `/signal`) or the EA inputs if you want a different distance. Leader and followers stay in sync when they take the signal numbers.

## 4. Followers

Attach `JevFollower` to the same symbol on each follower account. It only GETs `/signal`. It does not call Jev.

Lot math (same as `scaleLots` in `src/gold/policy.ts`):

    lot = InpLotMult * signal.lot * (AccountEquity / InpLeaderEquity)

Then round down to the broker lot step and clamp to `InpMinLot` / `InpMaxLot`. If that rounds below min lot, the EA does not open.

Set `InpLeaderEquity` to the leader account equity you want to scale against. Set `InpLotMult` to 1 to copy proportional to equity.

Follower SL/TP uses the same rule as the leader: EA inputs, then signal `slPoints` / `tpPoints`, then 600 / 800, then clamp to the broker stops level. Confirm the attached SL and TP on the new ticket in the Trade tab.

## 5. Notes

- Followers copy the signal, not the leader ticket stream. Fills will not match tick for tick.
- Netting-style: one side at a time. Opposite signal closes then opens when `GOLD_REVERSE=true` (default), so the scalp can flip in and out. No pyramiding.
- Do not attach these EAs to the Kuru dashboard process. `bun run start` stays MON-USDC on Monad.
