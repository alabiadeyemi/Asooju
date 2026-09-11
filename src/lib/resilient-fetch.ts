/** Fetch with timeout + exponential backoff for flaky networks. */
export type ResilientFetchOptions = RequestInit & {
  retries?: number;
  timeoutMs?: number;
  retryOn?: (res: Response | null, err: unknown) => boolean;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function defaultShouldRetry(res: Response | null, err: unknown) {
  if (err) {
    const msg = String((err as any)?.message || err);
    if (/abort|AbortError/i.test(msg)) return true;
    if (/failed to fetch|networkerror|load failed|timeout|ECONNRESET|ETIMEDOUT/i.test(msg)) {
      return true;
    }
    return false;
  }
  if (!res) return true;
  return res.status === 408 || res.status === 429 || res.status >= 500;
}

export async function resilientFetch(
  input: RequestInfo | URL,
  options: ResilientFetchOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    timeoutMs = 45000,
    retryOn = defaultShouldRetry,
    signal: outerSignal,
    ...init
  } = options;

  let lastErr: unknown = null;
  let lastRes: Response | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    outerSignal?.addEventListener("abort", onAbort);
    const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(input, { ...init, signal: ctrl.signal });
      lastRes = res;
      if (!retryOn(res, null) || attempt === retries) {
        return res;
      }
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff = Number.isFinite(retryAfter)
        ? retryAfter * 1000
        : Math.min(8000, 500 * 2 ** attempt) + Math.random() * 200;
      await sleep(backoff);
    } catch (err) {
      lastErr = err;
      if (!retryOn(null, err) || attempt === retries) {
        throw err instanceof Error ? err : new Error(String(err));
      }
      await sleep(Math.min(8000, 600 * 2 ** attempt) + Math.random() * 250);
    } finally {
      window.clearTimeout(timer);
      outerSignal?.removeEventListener("abort", onAbort);
    }
  }

  if (lastRes) return lastRes;
  throw lastErr instanceof Error ? lastErr : new Error("Network request failed after retries.");
}
