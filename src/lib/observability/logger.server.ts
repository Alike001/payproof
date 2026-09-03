import "server-only";

type LogLevel = "info" | "warn" | "error";
type SafeField = string | number | boolean | null | undefined;

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const IPV6 = /\b(?:[0-9a-f]{1,4}:){2,}[0-9a-f:]{1,39}\b/gi;
const PRIVATE_HEX = /0x[0-9a-fA-F]{64}\b/g;
const BEARER = /Bearer\s+[^\s,;]+/gi;

export function redactOperationalText(value: string): string {
  return value
    .replace(EMAIL, "[REDACTED_EMAIL]")
    .replace(IPV4, "[REDACTED_NETWORK]")
    .replace(IPV6, "[REDACTED_NETWORK]")
    .replace(PRIVATE_HEX, "[REDACTED_HEX]")
    .replace(BEARER, "Bearer [REDACTED]")
    .slice(0, 500);
}

export function operationalLog(
  level: LogLevel,
  event: string,
  fields: Record<string, SafeField> = {},
): void {
  const record = Object.fromEntries(
    Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        typeof value === "string" ? redactOperationalText(value) : value,
      ]),
  );
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event: redactOperationalText(event),
    ...record,
  });
  console[level](line);
}
