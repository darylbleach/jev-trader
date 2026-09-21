export type LateReason = "busy" | "interval";
export type ThrottleResult = { kind: "run" } | { kind: "late"; reason: LateReason };

/**
 * One decision at a time, and not more often than `intervalMs`.
 * Extra ticks are late and must not start a new model call.
 */
export class DecisionThrottle {
  private busy = false;
  private lastStart: number | null = null;

  constructor(readonly intervalMs: number) {}

  get inFlight(): boolean {
    return this.busy;
  }

  tryStart(now: number): ThrottleResult {
    if (this.busy) return { kind: "late", reason: "busy" };
    if (this.lastStart !== null && now - this.lastStart < this.intervalMs) return { kind: "late", reason: "interval" };
    this.busy = true;
    this.lastStart = now;
    return { kind: "run" };
  }

  finish(): void {
    this.busy = false;
  }
}
