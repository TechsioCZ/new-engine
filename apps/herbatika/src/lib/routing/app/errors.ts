export type UpstreamSource = "medusa" | "payload" | "url-registry"
export type UpstreamFailure =
  | "unavailable"
  | "invalid-payload"
  | "configuration"

export class StorefrontUpstreamError extends Error {
  readonly failure: UpstreamFailure
  readonly source: UpstreamSource

  constructor(
    source: UpstreamSource,
    failure: UpstreamFailure,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = "StorefrontUpstreamError"
    this.source = source
    this.failure = failure
  }
}

export const upstreamError = (
  source: UpstreamSource,
  failure: UpstreamFailure,
  message: string,
  cause?: unknown
) =>
  new StorefrontUpstreamError(
    source,
    failure,
    message,
    cause === undefined ? undefined : { cause }
  )
