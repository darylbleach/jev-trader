/** Worker/DO bindings that goldConfig and TypeSafe read via process.env. */
export const GOLD_ENV_KEYS = [
  "GOLD_MODEL",
  "MODEL",
  "TYPESAFE_AI_API_KEY",
  "JEV_MODEL_ID",
  "GOLD_DEMO",
  "GOLD_DRY_RUN",
  "GOLD_DUMMY_MT5",
  "GOLD_INTERVAL_MS",
  "GOLD_HORIZON_MS",
  "GOLD_LOT",
  "GOLD_MAX_LOT",
  "GOLD_MAX_SPREAD_PIPS",
  "GOLD_POINT",
  "GOLD_SL_POINTS",
  "GOLD_TP_POINTS",
  "GOLD_FILL_MODE",
  "GOLD_PAUSE_REALIZED_USD",
  "GOLD_REVERSE",
  "GOLD_MIN_REVERSE_POINTS",
  "GOLD_CONTRACT_SIZE",
  "XAUUSD_FEED_URL",
  "XAUUSD_SPOT_URL",
  "XAUUSD_SPOT_REFRESH_MS",
] as const;

export function applyWorkerEnv(env: object): void {
  if (typeof process === "undefined" || !process.env) return;
  for (const key of GOLD_ENV_KEYS) {
    const value = Reflect.get(env, key);
    if (typeof value === "string") process.env[key] = value;
  }
}
