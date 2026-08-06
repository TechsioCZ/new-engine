export type UrlRegistryErrorCode =
  | "UNIQUE_VIOLATION"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "INVALID_ALIAS"
  | "CONFIGURATION_ERROR"

export class UrlRegistryError extends Error {
  readonly code: UrlRegistryErrorCode

  constructor(
    code: UrlRegistryErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = "UrlRegistryError"
    this.code = code
  }
}

export const isUrlRegistryError = (value: unknown): value is UrlRegistryError =>
  value instanceof UrlRegistryError
