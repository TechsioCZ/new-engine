export type BoundedTextBodyResult =
  | Readonly<{ kind: "text"; value: string }>
  | Readonly<{ kind: "too-large" }>
  | Readonly<{ kind: "invalid-encoding" }>

const UNSIGNED_INTEGER = /^\d+$/

const declaredBodyIsTooLarge = (request: Request, maxBytes: number) => {
  const contentLength = request.headers.get("content-length")
  return (
    contentLength !== null &&
    UNSIGNED_INTEGER.test(contentLength) &&
    Number(contentLength) > maxBytes
  )
}

const cancelQuietly = async (
  reader: ReadableStreamDefaultReader<Uint8Array>
) => {
  try {
    await reader.cancel()
  } catch {
    // The size classification remains authoritative if cancellation races.
  }
}

const joinChunks = (chunks: readonly Uint8Array[], byteLength: number) => {
  const body = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

export const readBoundedTextBody = async (
  request: Request,
  maxBytes: number
): Promise<BoundedTextBodyResult> => {
  if (!(Number.isSafeInteger(maxBytes) && maxBytes > 0)) {
    throw new RangeError("maxBytes must be a positive safe integer")
  }
  if (declaredBodyIsTooLarge(request, maxBytes)) {
    return { kind: "too-large" }
  }
  if (!request.body) {
    return { kind: "text", value: "" }
  }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) {
        break
      }
      byteLength += result.value.byteLength
      if (byteLength > maxBytes) {
        await cancelQuietly(reader)
        return { kind: "too-large" }
      }
      chunks.push(result.value)
    }
  } finally {
    reader.releaseLock()
  }

  try {
    return {
      kind: "text",
      value: new TextDecoder("utf-8", { fatal: true }).decode(
        joinChunks(chunks, byteLength)
      ),
    }
  } catch {
    return { kind: "invalid-encoding" }
  }
}
