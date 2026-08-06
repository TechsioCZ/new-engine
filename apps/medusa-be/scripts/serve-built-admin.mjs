import { existsSync } from "node:fs"
import { readFile, stat } from "node:fs/promises"
import { createServer } from "node:http"
import path from "node:path"

const args = new Map(
  process.argv.slice(2).flatMap((arg, index, allArgs) => {
    if (!arg.startsWith("--")) {
      return []
    }

    const key = arg.slice(2)
    const value =
      allArgs[index + 1]?.startsWith("--") === true
        ? undefined
        : allArgs[index + 1]

    return [[key, value ?? "1"]]
  }),
)

const host = args.get("host") ?? "127.0.0.1"
const port = Number(args.get("port") ?? 9180)
const root = path.resolve(args.get("root") ?? ".medusa/admin")
const indexPath = path.join(root, "index.html")

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
])

const ADMIN_APP_PREFIX_PATTERN = /^\/app(?:\/|$)/u
const LEADING_SLASHES_PATTERN = /^\/+/u

/** @param {string} candidatePath - Candidate file-system path. */
const isInsideRoot = (candidatePath) =>
  candidatePath === root || candidatePath.startsWith(`${root}${path.sep}`)

/**
 * @param {string | undefined} requestUrl - Incoming request URL.
 * @returns {Promise<string | null>} Resolved asset path when allowed.
 */
const resolveRequestPath = async (requestUrl) => {
  const url = new URL(requestUrl ?? "/", `http://${host}:${port}`)
  const pathname = decodeURIComponent(url.pathname)
  const relativePath = pathname
    .replace(ADMIN_APP_PREFIX_PATTERN, "")
    .replace(LEADING_SLASHES_PATTERN, "")
  const filePath = path.resolve(root, relativePath)

  if (!isInsideRoot(filePath)) {
    return null
  }

  try {
    const fileStat = await stat(filePath)

    if (fileStat.isFile()) {
      return filePath
    }
  } catch {
    // Fall through to index.html for admin client routes.
  }

  return indexPath
}

if (!existsSync(indexPath)) {
  console.error(
    `Built admin not found at ${indexPath}. Run "pnpm build" in apps/medusa-be first.`,
  )
  process.exit(1)
}

/**
 * @param {import("node:http").IncomingMessage} request - Incoming HTTP request.
 * @param {import("node:http").ServerResponse} response - HTTP response writer.
 */
const handleRequest = async (request, response) => {
  const filePath = await resolveRequestPath(request.url)

  if (filePath === null) {
    response.writeHead(403)
    response.end("Forbidden")
    return
  }

  try {
    const body = await readFile(filePath)
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type":
        contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
    })
    response.end(body)
  } catch {
    response.writeHead(404)
    response.end("Not found")
  }
}

const server = createServer((request, response) => {
  void handleRequest(request, response)
})

server.listen(port, host, () => {
  console.log(
    `Serving built Medusa admin from ${root} at http://${host}:${port}`,
  )
})
