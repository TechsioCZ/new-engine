#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { setTimeout as sleep } from "node:timers/promises"

const DEFAULT_BASE_URL = "https://test-engine-medusa-be-zane.web-revolution.cz"
const DEFAULT_OUTPUT_ROOT = "local/medusa-backend-snapshots"
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_RETRIES = 2
const DEFAULT_ADMIN_LIMIT = 100
const DEFAULT_STORE_CATALOG_LIMIT = 48
const TOKEN_PREVIEW_LENGTH = 8

const argv = process.argv.slice(2)

function usage() {
  console.log(`Usage:
  scripts/dev/snapshot-medusa-backend.mjs [options]

Options:
  --base-url <url>          Deployed Medusa backend URL.
                            Defaults to MEDUSA_BACKEND_URL,
                            NEXT_PUBLIC_MEDUSA_BACKEND_URL, or Zane test BE.
  --email <email>           Admin email. Defaults to MEDUSA_ADMIN_EMAIL.
  --password <password>     Admin password. Defaults to MEDUSA_ADMIN_PASSWORD.
  --publishable-key <key>   Store API key. Defaults to MEDUSA_PUBLISHABLE_KEY
                            or NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY. If omitted,
                            the script picks an active admin API key with
                            sales channels.
  --output-dir <dir>        Snapshot root. Default: ${DEFAULT_OUTPUT_ROOT}
  --label <name>            Stable snapshot directory name. Default: timestamp.
  --include-orders          Fetch /admin/orders into local artifact output.
  --include-customers       Fetch /admin/customers into local artifact output.
  --max-pages <count>       Guard rail for paginated endpoints. Default: 200
  --timeout-ms <ms>         Per-request timeout. Default: ${DEFAULT_TIMEOUT_MS}
  --retries <count>         Retries per request after the first attempt.
                            Default: ${DEFAULT_RETRIES}
  -h, --help                Show this help.

Environment:
  MEDUSA_ADMIN_EMAIL
  MEDUSA_ADMIN_PASSWORD
  MEDUSA_BACKEND_URL
  MEDUSA_PUBLISHABLE_KEY
  NEXT_PUBLIC_MEDUSA_BACKEND_URL
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

Notes:
  - Tokens and passwords are never printed.
  - Output goes under local/ by default, which is gitignored in this repo.
  - Orders/customers are opt-in because they can contain PII.`)
}

function readOption(args) {
  const result = {
    baseUrl:
      process.env.MEDUSA_BACKEND_URL ??
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ??
      DEFAULT_BASE_URL,
    email: process.env.MEDUSA_ADMIN_EMAIL ?? "",
    password: process.env.MEDUSA_ADMIN_PASSWORD ?? "",
    publishableKey:
      process.env.MEDUSA_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ??
      "",
    outputDir: DEFAULT_OUTPUT_ROOT,
    label: "",
    includeOrders: false,
    includeCustomers: false,
    maxPages: 200,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    retries: DEFAULT_RETRIES,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    switch (arg) {
      case "--base-url":
        result.baseUrl = requireValue(args, ++index, arg)
        break
      case "--email":
        result.email = requireValue(args, ++index, arg)
        break
      case "--password":
        result.password = requireValue(args, ++index, arg)
        break
      case "--publishable-key":
        result.publishableKey = requireValue(args, ++index, arg)
        break
      case "--output-dir":
        result.outputDir = requireValue(args, ++index, arg)
        break
      case "--label":
        result.label = requireValue(args, ++index, arg)
        break
      case "--include-orders":
        result.includeOrders = true
        break
      case "--include-customers":
        result.includeCustomers = true
        break
      case "--max-pages":
        result.maxPages = parsePositiveInteger(requireValue(args, ++index, arg), arg)
        break
      case "--timeout-ms":
        result.timeoutMs = parsePositiveInteger(requireValue(args, ++index, arg), arg)
        break
      case "--retries":
        result.retries = parseNonNegativeInteger(requireValue(args, ++index, arg), arg)
        break
      case "-h":
      case "--help":
        usage()
        process.exit(0)
        break
      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  result.baseUrl = trimTrailingSlash(result.baseUrl)

  if (!result.baseUrl) {
    throw new Error("Missing backend URL. Use --base-url or MEDUSA_BACKEND_URL.")
  }

  if (!result.email) {
    throw new Error("Missing admin email. Use --email or MEDUSA_ADMIN_EMAIL.")
  }

  if (!result.password) {
    throw new Error("Missing admin password. Use --password or MEDUSA_ADMIN_PASSWORD.")
  }

  return result
}

function requireValue(args, index, flag) {
  const value = args[index]

  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}.`)
  }

  return value
}

function parsePositiveInteger(value, flag) {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${flag} must be a positive integer.`)
  }

  return parsed
}

function parseNonNegativeInteger(value, flag) {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative integer.`)
  }

  return parsed
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "")
}

function timestampLabel() {
  return new Date().toISOString().replace(/[:.]/g, "-")
}

function safeLabel(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-")
}

function tokenPreview(value) {
  if (!value) {
    return null
  }

  return `${value.slice(0, TOKEN_PREVIEW_LENGTH)}...`
}

function inferCount(value, key) {
  if (!value || typeof value !== "object") {
    return null
  }

  if (typeof value.count === "number") {
    return value.count
  }

  if (typeof value.total === "number") {
    return value.total
  }

  if (key && Array.isArray(value[key])) {
    return value[key].length
  }

  return null
}

function itemCount(value, key) {
  if (!value || typeof value !== "object") {
    return null
  }

  if (key && Array.isArray(value[key])) {
    return value[key].length
  }

  return null
}

function buildUrl(baseUrl, path, params = {}) {
  const url = new URL(path, baseUrl)

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item))
      }
      continue
    }

    url.searchParams.set(key, String(value))
  }

  return url
}

async function fetchJson(url, options, requestOptions = {}) {
  const retries = requestOptions.retries ?? DEFAULT_RETRIES
  const timeoutMs = requestOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS
  let lastError

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      const text = await response.text()
      let body = null

      if (text) {
        try {
          body = JSON.parse(text)
        } catch (error) {
          throw new Error(
            `Expected JSON from ${url.pathname}; got HTTP ${response.status} with invalid JSON.`
          )
        }
      }

      if (!response.ok) {
        const message =
          body && typeof body === "object" && "message" in body
            ? String(body.message)
            : response.statusText
        throw new Error(`HTTP ${response.status} ${url.pathname}: ${message}`)
      }

      return body
    } catch (error) {
      lastError = error

      if (attempt < retries) {
        await sleep(250 * (attempt + 1))
        continue
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  throw lastError
}

async function login(options) {
  const url = buildUrl(options.baseUrl, "/auth/user/emailpass")
  const body = await fetchJson(
    url,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: options.email,
        password: options.password,
      }),
    },
    options
  )

  if (!body || typeof body.token !== "string" || !body.token) {
    throw new Error("Admin login succeeded but no token was returned.")
  }

  return body.token
}

function adminHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
  }
}

function storeHeaders(publishableKey) {
  return {
    "x-publishable-api-key": publishableKey,
  }
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

async function saveEndpoint(outDir, fileName, payload) {
  const filePath = join(outDir, `${fileName}.json`)
  await writeJson(filePath, payload)
  return filePath
}

async function snapshotSingle(ctx, endpoint) {
  const url = buildUrl(ctx.options.baseUrl, endpoint.path, endpoint.params)
  const headers = endpoint.kind === "store" ? ctx.storeHeaders : ctx.adminHeaders
  const payload = await fetchJson(
    url,
    {
      method: "GET",
      headers,
    },
    ctx.options
  )
  const filePath = await saveEndpoint(ctx.outDir, endpoint.file, payload)

  return {
    file: filePath,
    count: inferCount(payload, endpoint.key),
    itemCount: itemCount(payload, endpoint.key),
    name: endpoint.name,
    ok: true,
    path: endpoint.path,
    type: "single",
  }
}

async function snapshotOffsetList(ctx, endpoint) {
  const headers = endpoint.kind === "store" ? ctx.storeHeaders : ctx.adminHeaders
  const itemKey = endpoint.key
  const limit = endpoint.limit ?? DEFAULT_ADMIN_LIMIT
  const items = []
  const pages = []
  let totalCount = null
  let offset = 0

  for (let pageIndex = 0; pageIndex < ctx.options.maxPages; pageIndex += 1) {
    const url = buildUrl(ctx.options.baseUrl, endpoint.path, {
      ...endpoint.params,
      limit,
      offset,
    })
    const payload = await fetchJson(
      url,
      {
        method: "GET",
        headers,
      },
      ctx.options
    )
    const pageItems = Array.isArray(payload?.[itemKey]) ? payload[itemKey] : []
    const payloadCount = inferCount(payload, itemKey)

    if (typeof payloadCount === "number") {
      totalCount = payloadCount
    }

    items.push(...pageItems)
    pages.push({
      count: pageItems.length,
      limit: payload?.limit ?? limit,
      offset: payload?.offset ?? offset,
    })

    if (typeof totalCount === "number" && items.length >= totalCount) {
      break
    }

    if (pageItems.length < limit) {
      break
    }

    offset += limit
  }

  const payload = {
    [itemKey]: items,
    count: totalCount ?? items.length,
    fetched_count: items.length,
    pages,
  }
  const filePath = await saveEndpoint(ctx.outDir, endpoint.file, payload)

  return {
    file: filePath,
    count: payload.count,
    fetchedCount: items.length,
    name: endpoint.name,
    ok: true,
    path: endpoint.path,
    type: "offset-list",
  }
}

async function snapshotPageList(ctx, endpoint) {
  const headers = endpoint.kind === "store" ? ctx.storeHeaders : ctx.adminHeaders
  const itemKey = endpoint.key
  const limit = endpoint.limit ?? DEFAULT_STORE_CATALOG_LIMIT
  const items = []
  const pages = []
  let totalCount = null
  let totalPages = null

  for (let page = 1; page <= ctx.options.maxPages; page += 1) {
    const url = buildUrl(ctx.options.baseUrl, endpoint.path, {
      ...endpoint.params,
      limit,
      page,
    })
    const payload = await fetchJson(
      url,
      {
        method: "GET",
        headers,
      },
      ctx.options
    )
    const pageItems = Array.isArray(payload?.[itemKey]) ? payload[itemKey] : []
    const payloadCount = inferCount(payload, itemKey)

    if (typeof payloadCount === "number") {
      totalCount = payloadCount
    }

    if (typeof payload?.totalPages === "number") {
      totalPages = payload.totalPages
    }

    items.push(...pageItems)
    pages.push({
      count: pageItems.length,
      limit: payload?.limit ?? limit,
      page: payload?.page ?? page,
    })

    if (typeof totalPages === "number" && page >= totalPages) {
      break
    }

    if (typeof totalCount === "number" && items.length >= totalCount) {
      break
    }

    if (pageItems.length < limit) {
      break
    }
  }

  const payload = {
    [itemKey]: items,
    count: totalCount ?? items.length,
    fetched_count: items.length,
    pages,
    total_pages: totalPages,
  }
  const filePath = await saveEndpoint(ctx.outDir, endpoint.file, payload)

  return {
    file: filePath,
    count: payload.count,
    fetchedCount: items.length,
    name: endpoint.name,
    ok: true,
    path: endpoint.path,
    type: "page-list",
  }
}

async function snapshotEndpoint(ctx, endpoint) {
  try {
    if (endpoint.mode === "offset") {
      return await snapshotOffsetList(ctx, endpoint)
    }

    if (endpoint.mode === "page") {
      return await snapshotPageList(ctx, endpoint)
    }

    return await snapshotSingle(ctx, endpoint)
  } catch (error) {
    const result = {
      error: error instanceof Error ? error.message : String(error),
      name: endpoint.name,
      ok: false,
      path: endpoint.path,
      required: endpoint.required !== false,
    }

    if (endpoint.required === false) {
      return result
    }

    throw Object.assign(new Error(`${endpoint.name}: ${result.error}`), {
      snapshotResult: result,
    })
  }
}

async function fetchAdminApiKeys(ctx) {
  const endpoint = {
    file: "admin-api-keys",
    key: "api_keys",
    kind: "admin",
    mode: "offset",
    name: "Admin API keys",
    params: { type: "publishable" },
    path: "/admin/api-keys",
  }
  const result = await snapshotEndpoint(ctx, endpoint)
  const payload = JSON.parse(
    await import("node:fs/promises").then(({ readFile }) =>
      readFile(result.file, "utf8")
    )
  )

  return {
    apiKeys: Array.isArray(payload.api_keys) ? payload.api_keys : [],
    result,
  }
}

async function fetchProvisioningKey(ctx) {
  const endpoint = {
    file: "admin-provisioning-publishable-key",
    kind: "admin",
    mode: "single",
    name: "Admin provisioning publishable key",
    path: "/admin/provisioning/publishable-key",
    required: false,
  }

  return snapshotEndpoint(ctx, endpoint)
}

function choosePublishableKey(options, apiKeys) {
  if (options.publishableKey) {
    return {
      source: "option-or-env",
      token: options.publishableKey,
    }
  }

  const activeLinkedKey = apiKeys.find(
    (apiKey) =>
      apiKey &&
      typeof apiKey === "object" &&
      typeof apiKey.token === "string" &&
      !apiKey.revoked_at &&
      Array.isArray(apiKey.sales_channels) &&
      apiKey.sales_channels.length > 0
  )

  if (activeLinkedKey) {
    return {
      id: activeLinkedKey.id,
      source: "admin-api-keys-sales-channel",
      title: activeLinkedKey.title,
      token: activeLinkedKey.token,
    }
  }

  const activeKey = apiKeys.find(
    (apiKey) =>
      apiKey &&
      typeof apiKey === "object" &&
      typeof apiKey.token === "string" &&
      !apiKey.revoked_at
  )

  if (activeKey) {
    return {
      id: activeKey.id,
      source: "admin-api-keys-active",
      title: activeKey.title,
      token: activeKey.token,
      warning: "Selected key has no sales_channels in the admin response.",
    }
  }

  return {
    source: "missing",
    token: "",
    warning: "No publishable key available; Store API snapshots will be skipped.",
  }
}

async function fetchStoreRegions(ctx) {
  const endpoint = {
    file: "store-regions",
    key: "regions",
    kind: "store",
    limit: 100,
    mode: "offset",
    name: "Store regions",
    path: "/store/regions",
  }
  const result = await snapshotEndpoint(ctx, endpoint)
  const payload = JSON.parse(
    await import("node:fs/promises").then(({ readFile }) =>
      readFile(result.file, "utf8")
    )
  )

  return {
    regions: Array.isArray(payload.regions) ? payload.regions : [],
    result,
  }
}

function firstRegionId(regions) {
  const region = regions.find(
    (item) => item && typeof item === "object" && typeof item.id === "string"
  )

  return region?.id ?? null
}

function adminEndpoints(options) {
  const endpoints = [
    {
      file: "admin-products",
      key: "products",
      kind: "admin",
      limit: 100,
      mode: "offset",
      name: "Admin products",
      path: "/admin/products",
    },
    {
      file: "admin-product-categories",
      key: "product_categories",
      kind: "admin",
      limit: 100,
      mode: "offset",
      name: "Admin product categories",
      path: "/admin/product-categories",
    },
    {
      file: "admin-collections",
      key: "collections",
      kind: "admin",
      limit: 100,
      mode: "offset",
      name: "Admin collections",
      path: "/admin/collections",
    },
    {
      file: "admin-regions",
      key: "regions",
      kind: "admin",
      limit: 100,
      mode: "offset",
      name: "Admin regions",
      path: "/admin/regions",
    },
    {
      file: "admin-shipping-options",
      key: "shipping_options",
      kind: "admin",
      limit: 100,
      mode: "offset",
      name: "Admin shipping options",
      path: "/admin/shipping-options",
    },
    {
      file: "admin-promotions",
      key: "promotions",
      kind: "admin",
      limit: 100,
      mode: "offset",
      name: "Admin promotions",
      path: "/admin/promotions",
    },
    {
      file: "admin-producers",
      key: "producers",
      kind: "admin",
      limit: 100,
      mode: "offset",
      name: "Admin producers",
      path: "/admin/producers",
    },
    {
      file: "admin-order-business-statuses",
      key: "orders",
      kind: "admin",
      limit: 100,
      mode: "offset",
      name: "Admin order business statuses",
      path: "/admin/order-business-statuses",
    },
    {
      file: "admin-order-expedition-carriers",
      key: "carriers",
      kind: "admin",
      mode: "single",
      name: "Admin order expedition carriers",
      path: "/admin/order-expedition/carriers",
    },
    {
      file: "admin-packeta-config",
      kind: "admin",
      mode: "single",
      name: "Admin Packeta config",
      path: "/admin/packeta-config",
    },
    {
      file: "admin-ppl-config",
      kind: "admin",
      mode: "single",
      name: "Admin PPL config",
      path: "/admin/ppl-config",
    },
    {
      file: "admin-qr-payment-config",
      kind: "admin",
      mode: "single",
      name: "Admin QR payment config",
      path: "/admin/qr-payment-config",
    },
  ]

  if (options.includeOrders) {
    endpoints.push({
      file: "admin-orders",
      key: "orders",
      kind: "admin",
      limit: 100,
      mode: "offset",
      name: "Admin orders",
      path: "/admin/orders",
    })
  }

  if (options.includeCustomers) {
    endpoints.push({
      file: "admin-customers",
      key: "customers",
      kind: "admin",
      limit: 100,
      mode: "offset",
      name: "Admin customers",
      path: "/admin/customers",
    })
  }

  return endpoints
}

function storeEndpoints(regionId) {
  return [
    {
      file: "store-products",
      key: "products",
      kind: "store",
      limit: 100,
      mode: "offset",
      name: "Store products",
      params: regionId ? { region_id: regionId } : {},
      path: "/store/products",
    },
    {
      file: "store-catalog-products",
      key: "products",
      kind: "store",
      limit: DEFAULT_STORE_CATALOG_LIMIT,
      mode: "page",
      name: "Store catalog products",
      params: regionId ? { region_id: regionId } : {},
      path: "/store/catalog/products",
      required: false,
    },
    {
      file: "store-product-categories",
      key: "product_categories",
      kind: "store",
      limit: 100,
      mode: "offset",
      name: "Store product categories",
      path: "/store/product-categories",
    },
    {
      file: "store-collections",
      key: "collections",
      kind: "store",
      limit: 100,
      mode: "offset",
      name: "Store collections",
      path: "/store/collections",
    },
    {
      file: "store-producers",
      key: "producers",
      kind: "store",
      limit: 100,
      mode: "offset",
      name: "Store producers",
      path: "/store/producers",
      required: false,
    },
    {
      file: "store-cms-page-categories",
      kind: "store",
      mode: "single",
      name: "Store CMS page categories",
      params: { locale: "sk" },
      path: "/store/cms/page-categories",
      required: false,
    },
    {
      file: "store-cms-article-categories",
      kind: "store",
      mode: "single",
      name: "Store CMS article categories",
      params: { locale: "sk" },
      path: "/store/cms/article-categories",
      required: false,
    },
    {
      file: "store-cms-hero-carousels",
      kind: "store",
      mode: "single",
      name: "Store CMS hero carousels",
      params: { locale: "sk", limit: 20 },
      path: "/store/cms/hero-carousels",
      required: false,
    },
  ]
}

function publicOptions(options) {
  return {
    baseUrl: options.baseUrl,
    includeCustomers: options.includeCustomers,
    includeOrders: options.includeOrders,
    maxPages: options.maxPages,
    outputDir: options.outputDir,
    retries: options.retries,
    timeoutMs: options.timeoutMs,
  }
}

function publicPublishableKeyChoice(choice) {
  return {
    id: choice.id,
    preview: tokenPreview(choice.token),
    source: choice.source,
    title: choice.title,
    warning: choice.warning,
  }
}

async function main() {
  const options = readOption(argv)
  const outDir = resolve(
    process.cwd(),
    options.outputDir,
    safeLabel(options.label || timestampLabel())
  )

  await mkdir(outDir, { recursive: true })

  console.error(`[snapshot] Backend: ${options.baseUrl}`)
  console.error(`[snapshot] Output: ${outDir}`)
  console.error("[snapshot] Logging in to Medusa admin...")

  const token = await login(options)
  const ctx = {
    adminHeaders: adminHeaders(token),
    options,
    outDir,
    storeHeaders: null,
  }

  const results = []
  const failed = []

  console.error("[snapshot] Fetching publishable API keys...")
  const apiKeysResult = await fetchAdminApiKeys(ctx)
  results.push(apiKeysResult.result)

  const provisioningResult = await fetchProvisioningKey(ctx)
  results.push(provisioningResult)

  const publishableKeyChoice = choosePublishableKey(options, apiKeysResult.apiKeys)
  const storeSnapshotsEnabled = Boolean(publishableKeyChoice.token)

  if (publishableKeyChoice.warning) {
    console.error(`[snapshot] Warning: ${publishableKeyChoice.warning}`)
  }

  console.error(
    `[snapshot] Store key source: ${publishableKeyChoice.source}${
      publishableKeyChoice.title ? ` (${publishableKeyChoice.title})` : ""
    }`
  )

  for (const endpoint of adminEndpoints(options)) {
    console.error(`[snapshot] Fetching ${endpoint.name}...`)
    const result = await snapshotEndpoint(ctx, endpoint)
    results.push(result)
    if (!result.ok) {
      failed.push(result)
      console.error(`[snapshot] Optional failed: ${endpoint.name}: ${result.error}`)
    }
  }

  let storeRegionId = null

  if (storeSnapshotsEnabled) {
    ctx.storeHeaders = storeHeaders(publishableKeyChoice.token)
    console.error("[snapshot] Fetching Store regions...")
    const storeRegionsResult = await fetchStoreRegions(ctx)
    results.push(storeRegionsResult.result)
    storeRegionId = firstRegionId(storeRegionsResult.regions)

    if (!storeRegionId) {
      console.error("[snapshot] Warning: no Store region id found; Store product prices may be incomplete.")
    }

    for (const endpoint of storeEndpoints(storeRegionId)) {
      console.error(`[snapshot] Fetching ${endpoint.name}...`)
      const result = await snapshotEndpoint(ctx, endpoint)
      results.push(result)
      if (!result.ok) {
        failed.push(result)
        console.error(`[snapshot] Optional failed: ${endpoint.name}: ${result.error}`)
      }
    }
  }

  const manifest = {
    backendUrl: options.baseUrl,
    createdAt: new Date().toISOString(),
    options: publicOptions(options),
    publishableKey: publicPublishableKeyChoice(publishableKeyChoice),
    results,
    storeRegionId,
    storeSnapshotsEnabled,
  }

  await writeJson(join(outDir, "manifest.json"), manifest)

  const summary = {
    failedOptional: failed.length,
    outputDir: outDir,
    snapshotFiles: results.filter((result) => result.ok).length + 1,
    storeSnapshotsEnabled,
  }

  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(`[snapshot] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
