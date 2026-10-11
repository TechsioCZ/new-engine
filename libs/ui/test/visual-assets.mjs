import { createHash } from "node:crypto"
import { readFile, realpath } from "node:fs/promises"
import path from "node:path"

/** @typedef {{_resourceType: string, request: {method: string, url: string}, response: {status: number, headers: {name: string, value: string}[], content: {mimeType: string, size: number, _file?: string, text?: string, encoding?: string}}}} HarEntry */
const assetTypes = new Set(["image", "font", "stylesheet"])
const hashedBody = /(?:^|\/)([a-f0-9]{64}|[a-f0-9]{40})\.[a-z0-9]+$/

/** @param {string} harPath @param {string} bodyFile @param {string} url */
async function readAttachedBody(harPath, bodyFile, url) {
  const root = path.dirname(harPath)
  const file = path.resolve(root, bodyFile)
  const relative = path.relative(root, file)
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Visual HAR body escapes its directory: ${bodyFile}`)
  }
  const contained = path.relative(await realpath(root), await realpath(file))
  if (contained.startsWith("..") || path.isAbsolute(contained)) {
    throw new Error(`Visual HAR body escapes its directory: ${bodyFile}`)
  }
  const body = await readFile(file)
  const hash = bodyFile.match(hashedBody)?.[1]
  if (
    hash &&
    createHash(hash.length === 64 ? "sha256" : "sha1")
      .update(body)
      .digest("hex") !== hash
  ) {
    throw new Error(`Visual HAR body changed: ${url}`)
  }
  return body
}

/** @param {string} harPath @param {HarEntry} entry */
async function readBody(harPath, entry) {
  const content = entry.response.content
  let body
  if (content._file) {
    body = await readAttachedBody(harPath, content._file, entry.request.url)
  } else {
    if (typeof content.text !== "string") {
      throw new Error(`Visual HAR body is missing: ${entry.request.url}`)
    }
    body = Buffer.from(
      content.text,
      content.encoding === "base64" ? "base64" : "utf8"
    )
  }
  if (
    content.encoding === "base64" &&
    body.toString("base64") !== content.text
  ) {
    throw new Error(`Visual HAR has invalid base64: ${entry.request.url}`)
  }
  // Playwright minimal HAR omits sizes using the standard -1 sentinel.
  if (
    body.length === 0 ||
    (content.size !== -1 && body.length !== content.size)
  ) {
    throw new Error(`Visual HAR body size changed: ${entry.request.url}`)
  }
  return body
}

/** @param {string} harPath */
async function readHar(harPath) {
  const har = JSON.parse(await readFile(harPath, "utf8"))
  /** @type {Map<string, HarEntry>} */
  const entries = new Map()
  for (const entry of /** @type {HarEntry[]} */ (har.log.entries)) {
    const { url, method } = entry.request
    const { status, content } = entry.response
    if (
      method !== "GET" ||
      entries.has(url) ||
      !assetTypes.has(entry._resourceType) ||
      !Number.isInteger(status) ||
      status < 200 ||
      status >= 300
    ) {
      throw new Error(`Invalid visual HAR entry: ${url}`)
    }
    const mime = content.mimeType.split(";", 1)[0].trim().toLowerCase()
    const contentType = entry.response.headers.find(
      (header) => header.name.toLowerCase() === "content-type"
    )?.value
    if (contentType?.split(";", 1)[0].trim().toLowerCase() !== mime) {
      throw new Error(
        `Visual HAR content type differs from response headers: ${url}`
      )
    }
    if (
      (entry._resourceType === "image" && !mime.startsWith("image/")) ||
      (entry._resourceType === "stylesheet" && mime !== "text/css") ||
      (entry._resourceType === "font" &&
        !(
          mime.startsWith("font/") ||
          mime.startsWith("application/font") ||
          [
            "application/octet-stream",
            "application/vnd.ms-fontobject",
          ].includes(mime)
        ))
    ) {
      throw new Error(
        `Visual HAR resource type differs from content type: ${url}`
      )
    }
    await readBody(harPath, entry)
    entries.set(url, entry)
  }
  if (!entries.size) {
    throw new Error("Visual HAR has no assets")
  }
  return { entries }
}

/**
 * Playwright owns HAR lookup and fulfillment. This adapter checks resource types
 * and waits for intercepted requests to finish. The context owns the routes and
 * listeners until it closes; disposal never exposes a pending request to the
 * live network.
 * @param {import("@playwright/test").BrowserContext} context
 * @param {{harPath: string, origin: string}} options
 */
export async function installVisualAssets(context, options) {
  const origin = new URL(options.origin).origin
  const { entries } = await readHar(options.harPath)
  /** @type {Error[]} */
  const errors = []
  /** @type {Map<import("@playwright/test").Request, PromiseWithResolvers<void>>} */
  const pending = new Map()
  let closing = false
  /** @param {import("@playwright/test").Request} request */
  function isAsset(request) {
    const url = new URL(request.url())
    return (
      ["http:", "https:"].includes(url.protocol) &&
      assetTypes.has(request.resourceType()) &&
      (url.origin !== origin || request.resourceType() === "image")
    )
  }
  context.on("request", (request) => {
    if (isAsset(request)) {
      pending.set(request, Promise.withResolvers())
    }
  })
  /** @param {import("@playwright/test").Request} request */
  function finish(request) {
    pending.get(request)?.resolve()
    pending.delete(request)
  }
  context.on("requestfinished", finish)
  context.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText
    const cancelled =
      ["net::ERR_ABORTED", "NS_BINDING_ABORTED"].includes(failure ?? "") ||
      failure?.includes("cancelled")
    if (pending.has(request) && !cancelled) {
      errors.push(
        new Error(`Visual asset request failed: ${request.url()}: ${failure}`)
      )
    }
    finish(request)
  })
  context.on("close", () => {
    for (const request of pending.keys()) {
      finish(request)
    }
  })
  const remoteUrls = [...entries.keys()]
    .filter((url) => new URL(url).origin !== origin)
    .map((url) => RegExp.escape(url))
  await context.routeFromHAR(options.harPath, {
    url: new RegExp(`^(?:${remoteUrls.join("|")})$`),
    notFound: "abort",
    update: false,
  })
  await context.route(
    (url) => url.origin !== origin,
    async (route) => {
      const request = route.request()
      if (!isAsset(request)) {
        await route.fallback()
        return
      }
      const entry = entries.get(request.url())
      if (
        closing ||
        entry?._resourceType !== request.resourceType() ||
        request.method() !== "GET"
      ) {
        errors.push(
          new Error(
            closing
              ? `Visual asset arrived during disposal: ${request.url()}`
              : `Visual HAR is missing ${request.resourceType()}: ${request.url()}`
          )
        )
        await route.abort("failed")
        return
      }
      await route.fallback()
    }
  )
  async function whenIdle() {
    while (pending.size) {
      await Promise.all([...pending.values()].map(({ promise }) => promise))
    }
    if (errors.length) {
      throw new AggregateError(errors, "Visual asset replay failed")
    }
  }
  async function dispose() {
    closing = true
    await whenIdle()
  }
  dispose.whenIdle = whenIdle
  /** @param {string} url */
  dispose.readSvg = async (url) => {
    const entry = entries.get(url)
    if (entry?._resourceType !== "image") {
      throw new Error(`Visual HAR is missing image: ${url}`)
    }
    if (
      entry.response.content.mimeType.split(";", 1)[0].trim().toLowerCase() !==
      "image/svg+xml"
    ) {
      return null
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(
      await readBody(options.harPath, entry)
    )
  }
  return dispose
}
