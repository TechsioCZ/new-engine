#!/usr/bin/env node

import { runUnderHashSafeContext } from "./hash-safe-workdir.mjs"

runUnderHashSafeContext("medusa", process.argv.slice(2))
