export async function fetchWithTimeout(
  fetcher: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("Telegraph request timed out.")), timeoutMs);
  const parentSignal = init.signal;
  const abortFromParent = () => controller.abort(parentSignal?.reason);
  if (parentSignal?.aborted) {
    abortFromParent();
  } else {
    parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  }

  try {
    return await fetcher(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
}

export function isCooldownElapsed(
  lastAttemptAt: Date | string | null,
  cooldownMs: number,
  nowMs = Date.now(),
): boolean {
  if (!lastAttemptAt) return true;
  const lastAttemptMs = new Date(lastAttemptAt).getTime();
  return Number.isFinite(lastAttemptMs) && nowMs - lastAttemptMs >= cooldownMs;
}
