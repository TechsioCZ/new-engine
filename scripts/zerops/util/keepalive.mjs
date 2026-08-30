#!/usr/bin/env node
/**
 * Minimal always-on process for the `util` service.
 *
 * The real work happens in run.initCommands (restore-seed.sh, sanitize-seed.sh),
 * which Zerops executes before the start command. A Zerops runtime service still
 * needs a long-lived process and a passing health check, so this serves a tiny
 * status page. Stop or delete the service once the import is verified.
 */

import http from "node:http"

const PORT = Number(process.env.PORT ?? 8080)

http
  .createServer((_request, response) => {
    response.writeHead(200, {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    })
    response.end("herbatica data-import utility: idle\n")
  })
  .listen(PORT, "0.0.0.0", () => {
    process.stdout.write(`[keepalive] listening on 0.0.0.0:${PORT}\n`)
  })
