import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer } from "node:http"
import path from "node:path"

const root = process.env.VISUAL_STORYBOOK_STATIC_DIR
  ? path.resolve(process.env.VISUAL_STORYBOOK_STATIC_DIR)
  : path.resolve(import.meta.dirname, "../storybook-static")
const port = Number(process.env.VISUAL_STORYBOOK_PORT ?? "6006")
const trailingSlash = /\/?$/
const singleByteRange = /^bytes=(\d*)-(\d*)$/
// Explicit types keep media decoding independent of browser MIME sniffing.
/** @type {Record<string, string>} */
const mimeTypes = {
  ".avif": "image/avif",
  ".aac": "audio/aac",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".m4a": "audio/mp4",
  ".m4s": "video/iso.segment",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".mpd": "application/dash+xml",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".ttf": "font/ttf",
  ".ts": "video/mp2t",
  ".vtt": "text/vtt; charset=utf-8",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
}

/** @param {string} url @returns {Promise<{ file: string, size: number } | undefined>} */
async function resolveFile(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname)
  const file = path.join(root, pathname)
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
    return
  }
  const info = await stat(file).catch(() => undefined)
  if (info?.isDirectory()) {
    return resolveFile(`${pathname.replace(trailingSlash, "/")}index.html`)
  }
  return info?.isFile() ? { file, size: info.size } : undefined
}

/**
 * Only a single byte range is needed by native media providers. Unsupported or
 * malformed ranges fall back to the full representation, as HTTP permits.
 * @param {string | undefined} header
 * @param {number} size
 * @returns {{ start: number, end: number } | "unsatisfiable" | undefined}
 */
function byteRange(header, size) {
  const match = singleByteRange.exec(header ?? "")
  if (!(match && (match[1] || match[2]))) {
    return
  }
  const first = match[1] ? Number(match[1]) : undefined
  const last = match[2] ? Number(match[2]) : undefined
  if (
    (first !== undefined && !Number.isSafeInteger(first)) ||
    (last !== undefined && !Number.isSafeInteger(last))
  ) {
    return
  }
  if (size === 0) {
    return "unsatisfiable"
  }
  if (first === undefined) {
    return last === 0
      ? "unsatisfiable"
      : { start: Math.max(0, size - last), end: size - 1 }
  }
  if (first >= size || (last !== undefined && last < first)) {
    return "unsatisfiable"
  }
  return { start: first, end: Math.min(last ?? size - 1, size - 1) }
}

const server = createServer(async (request, response) => {
  const resolved = await resolveFile(request.url ?? "/").catch(() => undefined)
  if (!resolved) {
    response.writeHead(404).end()
    return
  }
  const { file, size } = resolved
  const range =
    request.method === "GET" && !request.headers["if-range"]
      ? byteRange(request.headers.range, size)
      : undefined
  const headers = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Content-Type":
      mimeTypes[path.extname(file).toLowerCase()] ?? "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  }
  if (range === "unsatisfiable") {
    response
      .writeHead(416, {
        ...headers,
        "Content-Range": `bytes */${size}`,
        "Content-Length": 0,
      })
      .end()
    return
  }
  response.writeHead(range ? 206 : 200, {
    ...headers,
    "Content-Length": range ? range.end - range.start + 1 : size,
    ...(range
      ? { "Content-Range": `bytes ${range.start}-${range.end}/${size}` }
      : {}),
  })
  if (request.method === "HEAD") {
    response.end()
    return
  }
  const stream = createReadStream(file, range)
  stream.on("error", () => response.destroy())
  response.on("close", () => stream.destroy())
  stream.pipe(response)
})

server.listen(port, "127.0.0.1", () => {
  console.log(`Serving Storybook on http://127.0.0.1:${server.address().port}`)
})
