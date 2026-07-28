#!/usr/bin/env node

import { runUnderHashSafeContext } from "./hash-safe-workdir.mjs"

runUnderHashSafeContext(
  "vitest",
  // Package-manager forwarding separators are not Vitest arguments.
  process.argv
    .slice(2)
    .filter((arg) => arg !== "--")
)
