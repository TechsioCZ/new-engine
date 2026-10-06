import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer } from "node:http"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "../storybook-static")
const port = Number(process.env.VISUAL_STORYBOOK_PORT ?? "6006")
const trailingSlash = /\/?$/
// Explicit types keep image decoding independent of browser MIME sniffing.
/** @type {Record<string, string>} */
const mimeTypes = {
  ".avif": "image/avif",
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
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
}

/** @param {string} url @returns {Promise<string | undefined>} */
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
  return info?.isFile() ? file : undefined
}

createServer(async (request, response) => {
  const file = await resolveFile(request.url ?? "/").catch(() => undefined)
  if (!file) {
    response.writeHead(404).end()
    return
  }
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type":
      mimeTypes[path.extname(file).toLowerCase()] ?? "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  })
  createReadStream(file).pipe(response)
}).listen(port, "127.0.0.1")
