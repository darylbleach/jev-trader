/** Delay that works on Bun and Cloudflare Workers. */
export function sleep(ms: number): Promise<void> {
  const sched = (globalThis as { scheduler?: { wait?: (n: number) => Promise<void> } }).scheduler;
  if (typeof sched?.wait === "function") return sched.wait(ms);
  const bun = (globalThis as { Bun?: { sleep?: (n: number) => Promise<void> } }).Bun;
  if (typeof bun?.sleep === "function") return bun.sleep(ms);
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
