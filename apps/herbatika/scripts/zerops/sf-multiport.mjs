#!/usr/bin/env node
/**
 * Zerops four-market entrypoint for the Herbatika storefront.
 *
 * WHY THIS EXISTS
 * ---------------
 * Market selection is host-based: `resolveMarketContext` reads the request's
 * `Host` header and matches it against MARKET_ACCEPTED_HOSTS_{SK,CZ,HU,RO}.
 * Four markets therefore need four distinct public hostnames.
 *
 * Zerops issues one `*.zerops.app` subdomain per HTTP port on a service, so a
 * single service that exposes ports 3000-3003 gets four distinct hostnames,
 * and the L7 balancer forwards each request with that hostname in `Host`.
 *
 * Next's standalone server binds exactly one port, so this wrapper starts it on
 * PRIMARY_PORT and puts a raw TCP forwarder on each remaining port. The
 * forwarders splice byte streams and never parse or rewrite HTTP, so the
 * original `Host` header reaches Next untouched -- which is precisely what the
 * market authority requires. (An HTTP-level proxy would have to reconstruct the
 * header and risk normalizing it.)
 *
 * Process model: the Next child is the service's real workload. If it exits,
 * this wrapper exits with the same code so Zerops restarts the container.
 */

import { spawn } from "node:child_process"
import net from "node:net"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

// This file is deployed to <root>/apps/herbatika/scripts/zerops/sf-multiport.mjs
// and Next's standalone entrypoint sits at <root>/apps/herbatika/server.js.
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = path.resolve(SCRIPT_DIR, "..", "..")
const SERVER_ENTRY = path.join(APP_DIR, "server.js")

const PRIMARY_PORT = Number(process.env.SF_PRIMARY_PORT ?? 3000)
const FORWARD_PORTS = (process.env.SF_FORWARD_PORTS ?? "3001,3002,3003")
  .split(",")
  .map((entry) => Number(entry.trim()))
  .filter((port) => Number.isInteger(port) && port > 0 && port !== PRIMARY_PORT)

const BIND_HOST = "0.0.0.0"
const UPSTREAM_HOST = "127.0.0.1"

const log = (message) => {
  process.stdout.write(`[sf-multiport] ${message}\n`)
}

// ---------------------------------------------------------------------------
// Next standalone server
// ---------------------------------------------------------------------------

const next = spawn(process.execPath, [SERVER_ENTRY], {
  cwd: APP_DIR,
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: String(PRIMARY_PORT),
    HOSTNAME: BIND_HOST,
  },
})

log(`started Next standalone (pid ${next.pid}) on ${BIND_HOST}:${PRIMARY_PORT}`)

let shuttingDown = false

const shutdown = (signal) => {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  log(`received ${signal}, forwarding to Next`)
  next.kill(signal)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

next.on("exit", (code, signal) => {
  log(`Next exited (code=${code} signal=${signal})`)
  process.exit(typeof code === "number" ? code : 1)
})

next.on("error", (error) => {
  log(`failed to start Next: ${error.message}`)
  process.exit(1)
})

// ---------------------------------------------------------------------------
// Byte-transparent TCP forwarders for the remaining market hostnames
// ---------------------------------------------------------------------------

for (const port of FORWARD_PORTS) {
  const server = net.createServer((downstream) => {
    downstream.setNoDelay(true)

    const upstream = net.connect(PRIMARY_PORT, UPSTREAM_HOST)
    upstream.setNoDelay(true)

    const teardown = () => {
      downstream.destroy()
      upstream.destroy()
    }

    downstream.on("error", teardown)
    upstream.on("error", teardown)

    downstream.pipe(upstream)
    upstream.pipe(downstream)
  })

  server.on("error", (error) => {
    log(`forwarder on ${port} failed: ${error.message}`)
    process.exit(1)
  })

  server.listen(port, BIND_HOST, () => {
    log(`forwarding ${BIND_HOST}:${port} -> ${UPSTREAM_HOST}:${PRIMARY_PORT}`)
  })
}
