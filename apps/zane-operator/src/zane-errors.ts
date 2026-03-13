export class UpstreamHttpError extends Error {
  readonly status: number
  readonly errorCode: string

  constructor(status: number, errorCode: string, message: string) {
    super(message)
    this.name = "UpstreamHttpError"
    this.status = status
    this.errorCode = errorCode
  }
}
