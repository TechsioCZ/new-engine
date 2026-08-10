#!/usr/bin/env node

import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { runUnderHashSafeContext } from "./hash-safe-workdir.mjs"

if (process.argv[2] === "build") {
  const buildFilesDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "medusa-be-build-files-"),
  )
  process.once("exit", () => {
    fs.rmSync(buildFilesDirectory, { force: true, recursive: true })
  })

  const buildDefaults = {
    CACHE_PROVIDER: "inmemory",
    EVENT_BUS_PROVIDER: "local",
    FILE_LOCAL_UPLOAD_DIR: buildFilesDirectory,
    FILE_PROVIDER: "local",
    LOCKING_PROVIDER: "postgres",
    MEILISEARCH_ENABLED: "0",
    NOTIFICATION_PROVIDER: "local",
    REDIS_SESSIONS_ENABLED: "0",
    WORKFLOW_ENGINE_PROVIDER: "inmemory",
  }

  for (const [key, value] of Object.entries(buildDefaults)) {
    const currentValue = process.env[key]
    if (currentValue === undefined || currentValue.trim().length === 0) {
      process.env[key] = value
    }
  }
}

runUnderHashSafeContext("medusa", process.argv.slice(2))
