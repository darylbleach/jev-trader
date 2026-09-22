/** How long a non-demo room keeps polling after the last request. */
export const GOLD_ROOM_IDLE_MS = 15 * 60_000;

/**
 * The demo room is the trading clock. A closed browser must not stop it.
 * A production room (GOLD_DEMO=false) still stops once nobody is calling it,
 * so only the leader's posted ticks keep that process trading.
 */
export function keepGoldAlarm(opts: {
  demo: boolean;
  viewers: number;
  lastSeen: number;
  now: number;
  idleMs?: number;
}): boolean {
  if (opts.demo) return true;
  const idleMs = opts.idleMs ?? GOLD_ROOM_IDLE_MS;
  const idle = opts.viewers === 0 && opts.now - opts.lastSeen > idleMs;
  return !idle;
}
