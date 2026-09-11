/** Normalize any thrown value into a short, UI-safe message. */
export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (!error) return fallback;
  if (typeof error === "string") return cleanErrorText(error) || fallback;
  if (error instanceof Error) return cleanErrorText(error.message) || fallback;

  const anyErr = error as { message?: string; error?: string | { message?: string } };
  if (typeof anyErr.message === "string") return cleanErrorText(anyErr.message) || fallback;
  if (typeof anyErr.error === "string") return cleanErrorText(anyErr.error) || fallback;
  if (anyErr.error && typeof anyErr.error === "object" && typeof anyErr.error.message === "string") {
    return cleanErrorText(anyErr.error.message) || fallback;
  }

  try {
    return cleanErrorText(JSON.stringify(error)) || fallback;
  } catch {
    return fallback;
  }
}

/** Strip noise and collapse whitespace for display. */
export function cleanErrorText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^Error:\s*/i, "")
    .trim();
}

/** One-line toast / log friendly string. */
export function shortError(error: unknown, max = 160): string {
  const msg = getErrorMessage(error);
  if (msg.length <= max) return msg;
  return `${msg.slice(0, max - 1)}…`;
}

/** Chat / terminal body — wrapped, capped so layouts don't explode. */
export function displayError(error: unknown, max = 480): string {
  const msg = getErrorMessage(error);
  if (msg.length <= max) return msg;
  return `${msg.slice(0, max - 1)}…`;
}
