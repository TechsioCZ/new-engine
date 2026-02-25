import { BadRequestError } from "./db"

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
