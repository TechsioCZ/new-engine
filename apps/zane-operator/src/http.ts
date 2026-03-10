import { BadRequestError } from "./db"
import { UpstreamHttpError } from "./zane"

interface ErrorBody {
  error: string
  message: string
}

export function jsonResponse(status: number, payload: unknown): Response {
  return Response.json(payload, { status })
}

export function jsonError(status: number, error: string, message: string): Response {
  const body: ErrorBody = { error, message }
  return jsonResponse(status, body)
}

export function mapHandlerError(error: unknown, context: string): Response {
  if (error instanceof UpstreamHttpError) {
    const logLevel = error.status >= 500 ? console.error : console.warn
    logLevel(
      JSON.stringify({
        event: "handler.upstream_error",
        context,
        status: error.status,
        error_code: error.errorCode,
        message: error.message,
      }),
    )
    return jsonError(error.status, error.errorCode, error.message)
  }

  if (error instanceof BadRequestError) {
    console.warn(
      JSON.stringify({
        event: "handler.bad_request",
        context,
        message: error.message,
      }),
    )
    return jsonError(400, "bad_request", error.message)
  }

  const message = error instanceof Error ? error.message : String(error)
  console.error(
    JSON.stringify({
      event: "handler.error",
      context,
      message,
    }),
  )

  return jsonError(500, "internal_error", "Internal server error")
}
