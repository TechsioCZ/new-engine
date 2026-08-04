#!/usr/bin/env node

import { runUnderHashSafeContext } from "./hash-safe-workdir.mjs"

runUnderHashSafeContext("vitest", process.argv.slice(2))
