#!/usr/bin/env node

import { runUnderHashSafeContext } from "./hash-safe-workdir.mjs"

if (process.argv[2] === "build") {
  const buildDefaults = {
    CACHE_PROVIDER: "inmemory",
    EVENT_BUS_PROVIDER: "local",
    FILE_LOCAL_UPLOAD_DIR: "/tmp/medusa-be-build-files",
    FILE_PROVIDER: "local",
    LOCKING_PROVIDER: "postgres",
    MEILISEARCH_ENABLED: "0",
    NOTIFICATION_PROVIDER: "local",
    REDIS_SESSIONS_ENABLED: "0",
    WORKFLOW_ENGINE_PROVIDER: "inmemory",
  }

  for (const [key, value] of Object.entries(buildDefaults)) {
    process.env[key] ??= value
  }
}

runUnderHashSafeContext("medusa", process.argv.slice(2))
