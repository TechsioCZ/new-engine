#!/usr/bin/env node
import { createReadStream, renameSync, writeFileSync } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer } from "node:http"
import path from "node:path"

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

function readArg(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? (process.argv[index + 1] ?? null) : null
}

const rootArg = readArg("--root")
const readyFile = readArg("--ready-file")
const indexArg = readArg("--index")
const requestedPort = Number(readArg("--port") ?? "0")

if (
  !rootArg ||
  !readyFile ||
  !indexArg ||
  !Number.isInteger(requestedPort) ||
  requestedPort < 0 ||
  requestedPort > 65535
) {
  console.error(
    "Usage: storybook-a11y-server.mjs --root <dir> --index <index.json> --ready-file <file> [--port <port>]"
  )
  process.exit(1)
}

const root = path.resolve(rootArg)
const indexPath = path.resolve(indexArg)
let stopping = false

function send(response, status, body) {
  if (response.destroyed) return
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8" })
  response.end(body)
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1")
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
    const code = error && typeof error === "object" ? error.code : null
    if (code === "ENOENT" || code === "ENOTDIR") {
      send(response, 404, "Not found")
      return
    }
    console.error(error)
    send(response, 500, "Internal server error")
  }
})

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
  if (!address || typeof address === "string") {
    console.error("Unable to determine Storybook server port.")
    process.exit(1)
  }

  const temporaryReadyFile = `${readyFile}.${process.pid}.tmp`
  writeFileSync(temporaryReadyFile, `${address.port}\n`, "utf8")
  renameSync(temporaryReadyFile, readyFile)
  console.log(
    `Storybook static server listening on http://127.0.0.1:${address.port}`
  )
})

function stop() {
  if (stopping) return
  stopping = true
  server.closeAllConnections()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 5000).unref()
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.once(signal, stop)
}
