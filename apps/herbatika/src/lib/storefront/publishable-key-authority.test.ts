import { readdirSync, readFileSync } from "node:fs"
import { dirname, extname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const SOURCE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..")
const PUBLIC_KEY_ENV_NAME = [
  "NEXT_PUBLIC",
  "MEDUSA",
  "PUBLISHABLE",
  "KEY",
].join("_")
const SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
])
const TEST_FILE_PATTERN = /\.(?:spec|test)\.[cm]?[jt]sx?$/

const listProductionSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return listProductionSourceFiles(path)
    }
    if (!(entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name)))) {
      return []
    }
    if (TEST_FILE_PATTERN.test(entry.name)) {
      return []
    }
    return [path]
  })

describe("publishable-key authority boundary", () => {
  it("keeps public publishable-key environment authority out of production source", () => {
    const offenders = listProductionSourceFiles(SOURCE_ROOT).filter((path) =>
      readFileSync(path, "utf8").includes(PUBLIC_KEY_ENV_NAME)
    )

    expect(offenders).toEqual([])
  })
})
