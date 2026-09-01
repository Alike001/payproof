const SENSITIVE_KEY =
  /authorization|signature|private.?key|secret|payment.?signature|payment.?required|raw.?header|email|phone|contact/i;
const MAX_DEPTH = 5;
const MAX_ARRAY_ITEMS = 25;
const MAX_STRING_LENGTH = 1_000;

export function redactForPersistence(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH) {
    return "[TRUNCATED]";
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}[TRUNCATED]`
      : value;
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((entry) => redactForPersistence(entry, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        SENSITIVE_KEY.test(key)
          ? "[REDACTED]"
          : redactForPersistence(entry, depth + 1),
      ]),
    );
  }
  return String(value);
}
export function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown Telegraph error";
  return message
    .replace(/0x[0-9a-fA-F]{64,}/g, "[REDACTED_HEX]")
    .slice(0, 500);
}
