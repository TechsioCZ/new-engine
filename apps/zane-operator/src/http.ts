import { BadRequestError } from "./db"
import { UpstreamHttpError } from "./zane-errors"

interface ErrorBody {
  error: string
  message: string
}

export function jsonResponse(status: number, payload: unknown): Response {
  return Response.json(payload, { status })
}

export function jsonError(
  status: number,
  error: string,
  message: string,
): Response {
  const body: ErrorBody = { error, message }
  return jsonResponse(status, body)
}

export function mapHandlerError(error: unknown, context: string): Response {
  if (error instanceof UpstreamHttpError) {
    const logLevel = error.status >= 500 ? console.error : console.warn
    logLevel(
      JSON.stringify({
        context,
        error_code: error.errorCode,
        event: "handler.upstream_error",
        message: error.message,
        status: error.status,
      }),
    )
    return jsonError(error.status, error.errorCode, error.message)
  }

  if (error instanceof BadRequestError) {
    console.warn(
      JSON.stringify({
        context,
        event: "handler.bad_request",
        message: error.message,
      }),
    )
    return jsonError(400, "bad_request", error.message)
  }

  const message = error instanceof Error ? error.message : String(error)
  console.error(
    JSON.stringify({
      context,
      event: "handler.error",
      message,
    }),
  )

  return jsonError(500, "internal_error", "Internal server error")
}
