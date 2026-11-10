/**
 * Client-side job-status poller that is cheap on the server:
 *  - schedules the next check only after the previous one finished (no overlap)
 *  - does nothing while the browser tab is hidden, and checks immediately when it becomes visible again
 *  - backs off (up to 60s) after consecutive failed checks
 *  - gives up after `maxDurationMs`
 *  - returns a stop() function so callers can stop it on unmount / reset
 *
 * `tick` returns true when the job is finished and polling should stop.
 */
export interface PollerOptions {
  /** Delay between checks while everything is healthy. */
  intervalMs: number;
  /** Stop polling after this long (default 15 minutes). */
  maxDurationMs?: number;
  /** Called once if polling stops because maxDurationMs elapsed. */
  onTimeout?: () => void;
}

const MAX_BACKOFF_MS = 60_000;

export function startPoller(
  tick: () => Promise<boolean | void>,
  { intervalMs, maxDurationMs = 15 * 60_000, onTimeout }: PollerOptions
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  const startedAt = Date.now();

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const stop = () => {
    stopped = true;
    clear();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };

  const schedule = (delay: number) => {
    if (stopped) return;
    clear();
    timer = setTimeout(run, delay);
  };

  async function run() {
    if (stopped) return;
    if (Date.now() - startedAt > maxDurationMs) {
      stop();
      onTimeout?.();
      return;
    }
    // Tab hidden: skip the request entirely; onVisibility() resumes us.
    if (typeof document !== "undefined" && document.hidden) return;

    try {
      const done = await tick();
      failures = 0;
      if (done) {
        stop();
        return;
      }
    } catch {
      failures++;
    }
    const delay = Math.min(intervalMs * 2 ** Math.min(failures, 6), MAX_BACKOFF_MS);
    schedule(failures ? Math.max(delay, intervalMs) : intervalMs);
  }

  function onVisibility() {
    if (stopped || document.hidden) return;
    // Back in the foreground: check right away instead of waiting out the interval.
    schedule(0);
  }

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }
  schedule(intervalMs);

  return stop;
}
