const env = (key: string, fallback?: string) => process.env[key] ?? fallback;

/**
 * Locked public score: SL $3.00 / TP $2.00 (300 / 200). Already on the worker with book fills.
 * A $0.60 target is smaller than this ~$0.50 book and is retired. $0.80 / $1.50 would need
 * ~65% WR and unequal mark travel ($1.30 to TP vs $1.00 to SL). Keep $2 / $3 so one tape
 * is scored: equal ~$2.50 travel after the spread, 60% cash breakeven.
 */
export const GOLD_DEFAULT_SL_POINTS = 300;
/** Take profit locked with the stop above. Jev prompt dollars come from these defaults. */
export const GOLD_DEFAULT_TP_POINTS = 200;
/**
 * Demo-only: pause new dummy entries when realized is this many USD below the session peak.
 * `-20` means peak minus $20 (the 22 Sep collapse started +$11 then ran ten SL).
 * Set GOLD_PAUSE_REALIZED_USD=off to disable the peak gate. Production (GOLD_DEMO=false) never pauses.
 */
export const GOLD_DEFAULT_PAUSE_REALIZED_USD = -20;
/**
 * Demo-only hard floor. Resume cannot clear it. Stops another silent ~-$40 overnight
 * after someone resumes under the peak gate. Set GOLD_PAUSE_FLOOR_USD=off to disable.
 */
export const GOLD_DEFAULT_PAUSE_FLOOR_USD = -40;
/** Short near-term window Jev is asked about. Not a swing hold. */
export const GOLD_DEFAULT_HORIZON_MS = 6000;

/** Default proof path pays the book. Set GOLD_FILL_MODE=mid only for mid-fill comparison. */
export type GoldFillMode = "book" | "mid";

export function parseFillMode(raw: string | undefined, fallback: GoldFillMode = "book"): GoldFillMode {
  if (raw === undefined || raw === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "mid" || v === "book") return v;
  return fallback;
}

/** Env integers used for SL/TP. Zero, negative, or non-numeric values fall back so exits stay on. */
export function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

/**
 * Pause gate in USD. Empty / missing → default. `off` / `false` / `none` → disabled (null).
 * Non-numeric junk falls back to default so a typo cannot silently disable the safeguard.
 */
export function parsePauseUsd(
  raw: string | undefined,
  fallback: number | null,
): number | null {
  if (raw === undefined || raw === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "off" || v === "false" || v === "none" || v === "disable" || v === "disabled") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

export function parsePauseRealizedUsd(
  raw: string | undefined,
  fallback: number | null = GOLD_DEFAULT_PAUSE_REALIZED_USD,
): number | null {
  return parsePauseUsd(raw, fallback);
}

export function parsePauseFloorUsd(
  raw: string | undefined,
  fallback: number | null = GOLD_DEFAULT_PAUSE_FLOOR_USD,
): number | null {
  return parsePauseUsd(raw, fallback);
}

export const goldConfig = {
  port: Number(env("GOLD_PORT", "3001")),
  intervalMs: Number(env("GOLD_INTERVAL_MS", "1000")),
  horizonMs: Number(env("GOLD_HORIZON_MS", String(GOLD_DEFAULT_HORIZON_MS))),
  lot: Number(env("GOLD_LOT", "0.01")),
  maxLot: Number(env("GOLD_MAX_LOT", "1")),
  /** A retail XAUUSD book is often about 30 to 60 pips. 15 was a fake width around a printed mid. */
  maxSpreadPips: Number(env("GOLD_MAX_SPREAD_PIPS", "80")),
  /** XAUUSD point used to convert a price delta into pips. 0.01 is one pip on a 2-decimal quote. */
  point: Number(env("GOLD_POINT", "0.01")),
  slPoints: parsePositiveInt(env("GOLD_SL_POINTS"), GOLD_DEFAULT_SL_POINTS),
  tpPoints: parsePositiveInt(env("GOLD_TP_POINTS"), GOLD_DEFAULT_TP_POINTS),
  /**
   * Dummy / demo fill model. `book` (default): buy ask / sell bid, exit on the opposing side.
   * `mid` is comparison-only and must not be treated as broker-honest proof.
   */
  fillMode: parseFillMode(env("GOLD_FILL_MODE"), "book"),
  /** Peak-relative dummy pause. `-20` is $20 under the session realized high. Demo only. */
  pauseRealizedUsd: parsePauseRealizedUsd(env("GOLD_PAUSE_REALIZED_USD")),
  /** Absolute dummy pause floor. Resume cannot clear it. Demo only. */
  pauseFloorUsd: parsePauseFloorUsd(env("GOLD_PAUSE_FLOOR_USD")),
  reverse: env("GOLD_REVERSE", "true") !== "false",
  /**
   * Dummy reverse only after the live mid has moved at least this many points.
   * Stops scratch $0 closes when Jev flips on an unchanged spot.
   */
  minReversePoints: parsePositiveInt(env("GOLD_MIN_REVERSE_POINTS"), 1),
  dryRun: env("GOLD_DRY_RUN", "true") !== "false",
  /**
   * Simulated JevLeader tickets. Defaults on whenever dry-run is on (the demo).
   * Set GOLD_DUMMY_MT5=false to hide them, or GOLD_DRY_RUN=false when a real EA posts /fill.
   */
  dummyMt5: (env("GOLD_DUMMY_MT5") ?? env("GOLD_DRY_RUN", "true")) !== "false",
  /** Standard XAUUSD contract: 100 oz per lot. 0.01 lot and a $1 move is $1 P and L. */
  contractSize: Number(env("GOLD_CONTRACT_SIZE", "100")),
  /** GOLD_MODEL wins so gold can use Jev while the Kuru demo stays on mock. */
  model: (env("GOLD_MODEL") ?? env("MODEL", "mock")) as "mock" | "jev",
  jevModelId: env("JEV_MODEL_ID", "jev-latest")!,
  jevUsdPerMTok: 0.042,
  feedUrl: env("XAUUSD_FEED_URL"),
  /**
   * When true and no XAUUSD_FEED_URL is set, poll a public XAUUSD spot so the
   * demo decides on live gold. Set false for production so only JevLeader posts /tick.
   */
  demo: env("GOLD_DEMO", "true") !== "false",
  /** Optional extra spot URL. The live XAUUSD book is always tried first. */
  spotUrl: env("XAUUSD_SPOT_URL", "https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD")!,
  /**
   * How often to refresh the live book. Default matches GOLD_INTERVAL_MS.
   * The book itself reprints many times a minute, unlike a once-a-minute mid print.
   */
  spotRefreshMs: Number(env("XAUUSD_SPOT_REFRESH_MS", "1000")),
  historySize: 1000,
};
