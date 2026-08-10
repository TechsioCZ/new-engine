import { getRecordValue, isRecord } from "@techsio/std/object"

interface HttpError {
  response: {
    data: unknown
    status: number
  }
}

const rethrowHttpError = (error: unknown): never => {
  if (error instanceof Error) {
    throw error
  }
  throw new Error("Unexpected non-Error HTTP failure", { cause: error })
}

export const getHttpError = (error: unknown): HttpError => {
  if (!isRecord(error)) {
    return rethrowHttpError(error)
  }

  const response = getRecordValue(error, "response")
  if (!isRecord(response)) {
    return rethrowHttpError(error)
  }

  const status = getRecordValue(response, "status")
  if (typeof status !== "number" || !("data" in response)) {
    return rethrowHttpError(error)
  }

  return {
    response: {
      data: getRecordValue(response, "data"),
      status,
    },
  }
}
