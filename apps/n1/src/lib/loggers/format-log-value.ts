export function formatLogValue(value: unknown): string {
  if (value === null) {
    return "null"
  }

  if (value === undefined) {
    return "undefined"
  }

  if (typeof value === "string") {
    return value
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint" ||
    typeof value === "symbol"
  ) {
    return String(value)
  }

  if (value instanceof Error) {
    return value.message
  }

  try {
    return JSON.stringify(value) ?? Object.prototype.toString.call(value)
  } catch {
    return Object.prototype.toString.call(value)
  }
}
