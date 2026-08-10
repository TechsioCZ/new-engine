#!/usr/bin/env node
import { createReadStream, renameSync, writeFileSync } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer } from "node:http"
import path from "node:path"

const MAX_HEADER_BYTES = 16 * 1024
const MAX_REQUEST_URL_LENGTH = 8192
const SHUTDOWN_TIMEOUT_MS = 5000
const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
])

/** @param {string} name - CLI option name. */
const readArg = (name) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : (process.argv[index + 1] ?? null)
}

/** @param {unknown} error - Caught filesystem error. */
const errorCode = (error) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code
  }
  return null
}

/** @param {string | null} value - Candidate filesystem CLI argument. */
const isInvalidPathArgument = (value) =>
  value === null || value === "" || value.includes("\0")

const rootArg = readArg("--root")
const readyFile = readArg("--ready-file")
const indexArg = readArg("--index")
const requestedPort = Number(readArg("--port") ?? "0")
const invalidPort =
  !Number.isInteger(requestedPort) ||
  requestedPort < 0 ||
  requestedPort > 65_535

if (
  isInvalidPathArgument(rootArg) ||
  isInvalidPathArgument(readyFile) ||
  isInvalidPathArgument(indexArg) ||
  invalidPort
) {
  console.error(
    "Usage: storybook-a11y-server.mjs --root <dir> --index <index.json> --ready-file <file> [--port <port>]",
  )
  process.exit(1)
}

const root = path.resolve(rootArg)
const indexPath = path.resolve(indexArg)
let stopping = false

/**
 * @param {import("node:http").ServerResponse} response - HTTP response.
 * @param {number} status - HTTP status code.
 * @param {string} body - Plain-text response body.
 */
const send = (response, status, body) => {
  if (response.destroyed) {
    return
  }
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8" })
  response.end(body)
}

/**
 * @param {import("node:http").IncomingMessage} request - HTTP request.
 * @param {import("node:http").ServerResponse} response - HTTP response.
 */
const handleRequest = async (request, response) => {
  try {
    const rawUrl = request.url ?? "/"
    if (rawUrl.length > MAX_REQUEST_URL_LENGTH) {
      send(response, 414, "URI too long")
      return
    }
    const requestUrl = new URL(rawUrl, "http://127.0.0.1")
    const decodedPath = decodeURIComponent(requestUrl.pathname)
    const relativePath =
      decodedPath === "/" ? "index.html" : decodedPath.slice(1)
    let filePath =
      decodedPath === "/index.json"
        ? indexPath
        : path.resolve(root, relativePath)

    if (
      filePath !== indexPath &&
      filePath !== root &&
      !filePath.startsWith(`${root}${path.sep}`)
    ) {
      send(response, 403, "Forbidden")
      return
    }

    const fileStat = await stat(filePath)
    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, "index.html")
    }

    const finalStat = await stat(filePath)
    if (!finalStat.isFile()) {
      send(response, 404, "Not found")
      return
    }

    response.writeHead(200, {
      "cache-control": "no-store",
      "content-length": finalStat.size,
      "content-type":
        MIME_TYPES.get(path.extname(filePath).toLowerCase()) ??
        "application/octet-stream",
    })
    if (request.method === "HEAD") {
      response.end()
      return
    }

    const stream = createReadStream(filePath)
    stream.on("error", (error) => {
      console.error(error)
      response.destroy(error)
    })
    stream.pipe(response)
  } catch (error) {
    const code = errorCode(error)
    if (code === "ENOENT" || code === "ENOTDIR") {
      send(response, 404, "Not found")
      return
    }
    console.error(error)
    send(response, 500, "Internal server error")
  }
}

const server = createServer(
  { maxHeaderSize: MAX_HEADER_BYTES },
  (request, response) => {
    // handleRequest catches and translates every operational failure.
    void handleRequest(request, response)
  },
)

server.on("clientError", (error, socket) => {
  console.error(error)
  socket.destroy()
})

server.on("error", (error) => {
  console.error(error)
  process.exitCode = 1
})

server.listen(requestedPort, "127.0.0.1", () => {
  const address = server.address()
  if (address === null || typeof address === "string") {
    console.error("Unable to determine Storybook server port.")
    process.exit(1)
  }

  const temporaryReadyFile = `${readyFile}.${process.pid}.tmp`
  writeFileSync(temporaryReadyFile, `${address.port}\n`, "utf-8")
  renameSync(temporaryReadyFile, readyFile)
  console.log(
    `Storybook static server listening on http://127.0.0.1:${address.port}`,
  )
})

const stop = () => {
  if (stopping) {
    return
  }
  stopping = true
  server.closeAllConnections()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref()
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.once(signal, stop)
}
