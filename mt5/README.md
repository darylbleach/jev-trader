# Jev XAUUSD MT5 copy trader

This is the full guide for turning the gold process into a MetaTrader 5 copy-trader: one leader account that feeds live prices and trades first, plus any number of follower accounts that copy the same buy/sell signal.

It is a broker gold CFD. It is not the Monad/Kuru MON-USDC tweet demo. Leave `bun run start` alone. Experimental, small size, not financial advice.

## What we are building

Jev (or a stand-in model) looks at an XAUUSD quote and answers buy or sell about once a second. It is asked about a short near-term move (`GOLD_HORIZON_MS`, default 6 seconds). It does not abstain. The gold server turns that answer into a signal with a lot size, stop-loss points, and take-profit points.

Two Expert Advisors in this folder talk HTTP to that server and place market orders on your broker:

- `JevLeader.mq5` posts the broker bid/ask to `/tick`, reads `/signal`, and trades on the leader account.
- `JevFollower.mq5` only reads `/signal`. It never calls Jev. It sizes lots from equity and copies the side.

Followers copy the signal, not the leader ticket stream. Fills will not match tick for tick across brokers. That is expected.

```
  live gold spot (demo)          broker XAUUSD ticks (production)
           |                              |
           v                              v
     bun run gold  <------ POST /tick ---- JevLeader (one account)
           |
           +-- GET /signal --> JevLeader trades
           |
           +-- GET /signal --> JevFollower (each copy account)
```

The shareable Cloudflare page at https://jev-gold-demo.darylbleach.workers.dev is the same dashboard idea, running on a live public gold spot, with dummy MT5 tickets so you can show someone the tape. Do not point production EAs at that Worker. It is a mock-model demo, not your always-on signal host.

## The two modes (do not mix them)

### Demo / show someone

Used to prove Jev (or the stand-in) can decide on gold without a broker.

- Run `bun run gold` with `GOLD_DEMO=true` (default).
- The process polls a public XAUUSD spot (`https://api.gold-api.com/price/XAU`, Yahoo GC=F as fallback).
- The dashboard pill says `live` when that spot is landing.
- Dummy MT5 tickets open and close on the page so you can see P and L.
- If the spot is down, the page falls back to a small random walk and the pill says `demo`.
- Cloudflare uses the same live spot. Same rule: show it, do not trade from it.

### Production copy trader

Used when real MT5 terminals should trade.

- Run `bun run gold` on a machine that stays up.
- `GOLD_MODEL=jev` and `TYPESAFE_AI_API_KEY` set.
- `GOLD_DRY_RUN=false`
- `GOLD_DUMMY_MT5=false`
- `GOLD_DEMO=false` so the built-in spot poller is off. Only JevLeader posts `/tick`.
- Attach `JevLeader` on one account. Attach `JevFollower` on each follower.
- Paper / demo broker first. Then tiny live lots.

If you leave `GOLD_DEMO=true` while a leader is attached, the live spot and the broker ticks both hit `/tick` and the model sees a mixed tape. Turn the demo poller off for production.

## What the gold server does

From the repo root:

    bun run gold

Default bind is `http://127.0.0.1:3001`. Open `/` or `/demo` for the dashboard.

| Path | Who uses it | What it is |
| --- | --- | --- |
| `GET /` `GET /demo` | you | live dashboard |
| `GET /status` | you / debug | snapshot: feed, model, latest signal, dummy P and L |
| `GET /signal` | both EAs | latest buy/sell, lot, slPoints, tpPoints, seq, ts |
| `POST /tick` | JevLeader (or the live-spot poller in demo) | bid/ask (or mid/price) |
| `POST /fill` | JevLeader after a broker fill | ticket, side, lots, price |
| `GET /events` | dashboard | SSE stream of ticks, signals, fills |

A signal looks like this (fields that matter to the EAs):

    {
      "seq": 42,
      "ts": 1789990000000,
      "action": "buy",
      "position": "buy",
      "lot": 0.01,
      "slPoints": 600,
      "tpPoints": 800,
      "spreadOk": true,
      "mid": 4341.5,
      "bid": 4341.42,
      "ask": 4341.58
    }

`seq` is how the EAs know something new happened. They ignore a repeat of the same `seq` and `action`. `ts` must be fresh (`InpMaxAgeMs`, default 5000). `spreadOk` is false when the quote is too wide (`GOLD_MAX_SPREAD_PIPS`, default 30). Both EAs fail closed on a stale `ts`, a wide spread, or an HTTP error.

`slPoints` / `tpPoints` default to 600 / 800. On a 2-decimal gold quote (`SYMBOL_POINT` 0.01) that is $6 stop loss and $8 take profit. Every new market order always gets both. The EAs also raise the distance to `SYMBOL_TRADE_STOPS_LEVEL` so the broker does not reject the order.

Netting-style: one side at a time. Opposite signal closes, then opens, when `GOLD_REVERSE=true` (default). No pyramiding.

## Live gold prices on the demo

The demo no longer invents a price path after one seed.

1. Every `XAUUSD_SPOT_REFRESH_MS` (default 5s) the process fetches `XAUUSD_SPOT_URL` (default `https://api.gold-api.com/price/XAU`).
2. If that fails, it tries Yahoo COMEX gold futures (`GC=F`) as a fallback.
3. Jev still answers every `GOLD_INTERVAL_MS` (default 1s) on the last live mid. Spot gold does not print a new tick every second, so the mid can sit still between refreshes. That is honest.
4. If a live quote has landed and the next fetch fails, the last live mid is held. No walk.
5. If no live quote has ever landed, a small walk around 2650 keeps the page alive and the feed pill says `demo`.

Override the spot URL with `XAUUSD_SPOT_URL`. Override the whole poller with `XAUUSD_FEED_URL` pointing at your own JSON (`{bid,ask}` or `{mid}` / `{price}`).

This live spot is not your broker's XAUUSD bid/ask. Broker gold is a CFD. Spreads, suffixes (`XAUUSDm`, `GOLD`), and the last digit will differ. Production must use the leader's broker ticks.

## Production server setup

1. Use a VPS or a PC that never sleeps. The EAs poll every 200 ms. If the gold process dies, they fail closed and stop trading.
2. Install Bun (`curl -fsSL https://bun.sh/install | bash`) and clone this repo.
3. Copy `.env.example` to `.env` and set at least:

        GOLD_MODEL=jev
        TYPESAFE_AI_API_KEY=...
        GOLD_DRY_RUN=false
        GOLD_DUMMY_MT5=false
        GOLD_DEMO=false
        GOLD_PORT=3001
        GOLD_LOT=0.01
        GOLD_SL_POINTS=600
        GOLD_TP_POINTS=800

4. Start it and keep it running (`tmux`, `systemd`, or similar):

        bun run gold

5. Confirm before attaching EAs:

        curl -s -X POST http://127.0.0.1:3001/tick -H 'content-type: application/json' \
          -d '{"bid":4341.10,"ask":4341.40}'
        curl -s http://127.0.0.1:3001/signal
        curl -s http://127.0.0.1:3001/status

   `/status` should show `"dryRun": false` and `"feed": "idle"` until the leader starts posting. `/signal` should include `action`, `position`, `seq`, `lot`, `slPoints`, `tpPoints`.

6. Same machine as MT5: `InpServer=http://127.0.0.1:3001`.
   Remote terminals: put the process behind HTTPS and use that origin, for example `https://gold.your-host.example`. MT5 WebRequest wants the origin only (no path). HTTP on a LAN IP also works if you add that exact origin.

Do not attach these EAs to `bun run start`. That process is MON-USDC on Kuru.

## Install the Expert Advisors

This repo ships source only. There are no `.ex5` files.

1. On each MT5 terminal, open File, Open Data Folder, then `MQL5/Experts/`.
2. Create a folder named `Jev`.
3. Copy these three files into that folder. The `.mqh` must sit next to the EAs.

        mt5/JevHttp.mqh
        mt5/JevLeader.mq5
        mt5/JevFollower.mq5

4. Open MetaEditor, compile `JevLeader.mq5` and `JevFollower.mq5`. Both must compile with no errors.
5. In MT5: Tools, Options, Expert Advisors.
   - Enable Allow algorithmic trading.
   - Enable Allow WebRequest for listed URL.
   - Add the gold origin only, for example `http://127.0.0.1:3001` or `https://gold.your-host.example`. No `/signal` path.
6. Turn the Algo Trading button on in the toolbar. If it is red, nothing sends.

The shared include (`JevHttp.mqh`) does the HTTP, JSON field reads, symbol fallback, lot rounding, and SL/TP math. If you move the EAs, keep the include beside them.

## Leader account

Attach `JevLeader` to an XAUUSD / GOLD / XAUUSDm chart on the account that should trade first. One leader only.

| Input | Default | Meaning |
| --- | --- | --- |
| `InpServer` | `http://127.0.0.1:3001` | gold origin, no path |
| `InpSymbol` | `XAUUSD` | falls back to GOLD, XAUUSDm, and a few suffixes |
| `InpLot` | `0.01` | used only if the signal lot is missing |
| `InpSlippage` | `30` | points |
| `InpMagic` | `210921` | marks leader tickets. Do not reuse on a follower |
| `InpSLPoints` | `600` | $6 on a 0.01 point gold quote. 0 means "use the signal" |
| `InpTPPoints` | `800` | $8 on a 0.01 point gold quote. 0 means "use the signal" |
| `InpMaxSpreadPips` | `30` | fail closed if the broker spread is wider |
| `InpMaxAgeMs` | `5000` | fail closed if `/signal` is older than this |
| `InpTimeoutMs` | `2000` | WebRequest timeout |
| `InpPollMs` | `200` | POST `/tick` and GET `/signal` |

Every ~200 ms the leader:

1. Reads `SYMBOL_BID` / `SYMBOL_ASK` on the attached symbol.
2. POSTs them to `/tick`. That is the production price feed.
3. GETs `/signal`.
4. Drops the tick if HTTP failed, `ts` is stale, `spreadOk` is false, or the broker spread is above the cap.
5. On a new `seq`, opens, reverses, or flattens to match `position`.
6. After a fill, POSTs `/fill` so the dashboard can show the real ticket.

SL/TP on the new order: EA input if > 0, else signal points, else 600 / 800, then clamp to `SYMBOL_TRADE_STOPS_LEVEL`. Confirm the attached SL and TP on the ticket in the Trade tab. If they are missing, the broker rejected stops and the scalp may not close.

Experts log on attach should print `JevLeader symbol=... server=... sl=... tp=...`.

## Follower accounts

Attach `JevFollower` to the same symbol family on each copy account. Many followers can share one gold server. They only GET `/signal`. They do not POST `/tick` or `/fill`. They do not call Jev.

| Input | Default | Meaning |
| --- | --- | --- |
| `InpServer` | `http://127.0.0.1:3001` | same origin as the leader |
| `InpSymbol` | `XAUUSD` | same fallback list |
| `InpLotMult` | `1.0` | 1 is a straight equity copy. Use 0.5 to trade half |
| `InpLeaderEquity` | `1000` | leader equity you want to scale against. Must be > 0 |
| `InpMinLot` | `0.01` | do not open if rounding falls below this |
| `InpMaxLot` | `1.0` | hard cap after scaling |
| `InpMagic` | `210922` | different from the leader on purpose |
| `InpSLPoints` / `InpTPPoints` | `600` / `800` | same resolve rule as the leader |
| `InpMaxSpreadPips` / `InpMaxAgeMs` | `30` / `5000` | same fail-closed rules |

Lot math (same as `scaleLots` in `src/gold/policy.ts`):

    lot = InpLotMult * signal.lot * (AccountEquity / InpLeaderEquity)

Then round down to the broker lot step and clamp to `InpMinLot` / `InpMaxLot`. If that rounds below min lot, the EA does not open and logs `scaled lot is 0`.

Worked examples with `signal.lot = 0.01`, `InpLotMult = 1`, broker min 0.01, step 0.01:

| Leader equity input | Follower equity | Raw lot | Traded |
| --- | --- | --- | --- |
| 10,000 | 10,000 | 0.01 | 0.01 |
| 10,000 | 20,000 | 0.02 | 0.02 |
| 10,000 | 2,000 | 0.002 | none (below min) |
| 1,000 | 2,000 | 0.02 | 0.02 |

A small follower against a large `InpLeaderEquity` will sit flat until you raise `InpLotMult` or lower `InpMinLot` if the broker allows it. Set `InpLeaderEquity` to the real leader equity you care about, not a guess, or the copy size is wrong.

SL/TP uses the same resolve rule as the leader so both sides aim at the same dollar distance. Brokers still fill independently.

If leader and follower ever sit on one account, keep the magic numbers different (defaults already are). Each EA only closes its own tickets.

## Rollout order

1. Demo with no MT5. `bun run gold`, open `/demo`. Pill says `live`. Mid should be around the real gold spot (thousands of dollars, not the old 2650 walk). Dummy tickets open and close with P and L.
2. Paper leader only. `GOLD_DEMO=false`, `GOLD_DRY_RUN=false`. Attach `JevLeader` on a demo account. Watch the Experts log, `/demo`, and the Trade tab: opens, reverses, SL/TP exits.
3. One paper follower. Check lot scaling and that the follower lags the leader. They copy the signal, not the ticket.
4. Tiny live lots (`GOLD_LOT=0.01`, follower `InpMaxLot` clamped). Then raise `InpLotMult` if you want.

Keep `GOLD_REVERSE=true` unless you explicitly want an opposite signal to flatten instead of flip.

## Fail-closed behavior

The EAs do nothing when:

- WebRequest is not allowlisted (error 4014 in the Experts log).
- The gold server is down or returns a non-2xx.
- `/signal` `ts` is older than `InpMaxAgeMs`.
- `spreadOk` is false, or the local broker spread is above `InpMaxSpreadPips`.
- The action is not `buy`, `sell`, or `hold`.
- The lot rounds to 0.
- SL/TP would compute to zero (the include refuses the order).

They do not retry a missed `seq`. The next new `seq` is the next trade. A brief outage means a skipped scalp, not a catch-up dump.

## What not to do

- Do not point production EAs at `https://jev-gold-demo.darylbleach.workers.dev`.
- Do not leave `GOLD_DEMO=true` or `GOLD_DRY_RUN=true` once a real leader is posting ticks.
- Do not attach these EAs to the Kuru process (`bun run start`).
- Do not skip the WebRequest allowlist. The EAs will look dead.
- Do not reuse one magic number across leader and follower on the same account.
- Do not expect ticket-for-ticket matching across brokers. This is a signal copier.
- Do not treat dummy MT5 P and L as a broker statement. Dummy opens at mid with a model spread. A live account pays the broker spread and slippage.

## Environment reference (gold process)

| Variable | Default | Production |
| --- | --- | --- |
| `GOLD_PORT` | `3001` | bind you will allowlist |
| `GOLD_MODEL` | `mock` (or `MODEL`) | `jev` |
| `TYPESAFE_AI_API_KEY` | unset | required for Jev |
| `GOLD_DEMO` | `true` | `false` |
| `GOLD_DRY_RUN` | `true` | `false` |
| `GOLD_DUMMY_MT5` | follows dry-run | `false` |
| `GOLD_INTERVAL_MS` | `1000` | how often Jev is asked |
| `GOLD_HORIZON_MS` | `6000` | look-ahead window |
| `GOLD_LOT` | `0.01` | leader signal lot |
| `GOLD_MAX_LOT` | `1` | server-side cap |
| `GOLD_SL_POINTS` | `600` | rides on `/signal` |
| `GOLD_TP_POINTS` | `800` | rides on `/signal` |
| `GOLD_REVERSE` | `true` | flip on opposite signal |
| `GOLD_MAX_SPREAD_PIPS` | `30` | `spreadOk` threshold |
| `XAUUSD_FEED_URL` | unset | leave unset in production |
| `XAUUSD_SPOT_URL` | gold-api XAU | demo only |
| `XAUUSD_SPOT_REFRESH_MS` | `5000` | demo only |

`GOLD_MODEL` wins over `MODEL`, so gold can use Jev while the Kuru tweet demo stays on mock.

## Files

| Path | Role |
| --- | --- |
| `src/gold/index.ts` | gold process entry |
| `src/gold/spot.ts` | live XAUUSD spot poller for the demo |
| `src/gold/trader.ts` | throttle, model call, dummy MT5 |
| `src/gold/server.ts` | HTTP API the EAs use |
| `src/gold/policy.ts` | position, lot scale, SL/TP resolve |
| `mt5/JevHttp.mqh` | shared MT5 HTTP and order helpers |
| `mt5/JevLeader.mq5` | price poster and first trader |
| `mt5/JevFollower.mq5` | equity-scaled copier |

## Troubleshooting

**Pill says `demo` and mid is near 2650.** The live spot fetch failed. Check outbound HTTPS to `api.gold-api.com`. The page will switch to `live` when a quote lands.

**Mid is live but dummy tickets never open.** Dry-run dummy is on by default. Wait for the first decision (`seq` incrementing). If `GOLD_DUMMY_MT5=false`, the dummy tape is hidden on purpose.

**EA attaches, then silence.** Tools, Options, Expert Advisors: allow the exact origin. Check the Experts log for `Jev WebRequest failed err=4014`. Restart MT5 after adding a URL.

**`stale signal`.** Machine clocks matter. `ts` is compared to GMT. If the VPS clock is wrong, raise `InpMaxAgeMs` only as a temporary check, then fix NTP.

**Follower never opens.** Log `scaled lot is 0`. Lower `InpLeaderEquity`, raise `InpLotMult`, or confirm `InpMinLot` vs the broker minimum.

**Orders reject.** Stops too tight for `SYMBOL_TRADE_STOPS_LEVEL`, market closed, or auto-trading off. The include already raises SL/TP to the stops level. Check the Trade tab and the retcode in the Experts log.

**Leader and follower disagree.** Different brokers, different spreads, different `seq` arrival times. This is a signal copier. If `InpServer` differs, they are not on the same host.

**Jev on the Cloudflare demo.** The public Worker already runs `GOLD_MODEL=jev` on the live XAUUSD spot. `TYPESAFE_AI_API_KEY` is a Worker secret only. Still not a production signal host.
