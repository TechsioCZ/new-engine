import type { PayloadRequest } from 'payload'

const RETURN_HTML_HEADER = 'x-payload-return-html'

type RequestTimeout = {
  controller: AbortController
  clearTimeout: () => void
}

/** Create an abortable request timeout and a cleanup handler. */
export const createRequestTimeout = (timeoutMs: number): RequestTimeout => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  return {
    controller,
    clearTimeout: () => clearTimeout(timeoutId),
  }
}

export const shouldReturnHtmlForRequest = (req?: PayloadRequest): boolean => {
  if (!req || req.method !== 'GET') {
    return false
  }

  const headerValue = req.headers?.get?.(RETURN_HTML_HEADER)
  return headerValue === 'true'
}
