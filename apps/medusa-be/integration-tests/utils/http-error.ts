import { isRecord } from "@techsio/std/object"

type HttpError = {
  response: {
    data: unknown
    status: number
  }
}

export const getHttpError = (error: unknown): HttpError => {
  if (
    isRecord(error) &&
    isRecord(error["response"]) &&
    typeof error["response"]["status"] === "number" &&
    "data" in error["response"]
  ) {
    return {
      response: {
        data: error["response"]["data"],
        status: error["response"]["status"],
      },
    }
  }

  throw error
}
