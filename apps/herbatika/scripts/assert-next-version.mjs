import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

export const EXPECTED_NEXT_VERSION = "16.3.0-preview.5"

export const assertNextVersionValues = ({
  installedVersion,
  manifestVersion,
}) => {
  if (manifestVersion !== EXPECTED_NEXT_VERSION) {
    throw new Error(
      `Next.js manifest requires ${manifestVersion}; expected exactly ${EXPECTED_NEXT_VERSION}`
    )
  }

  if (installedVersion !== EXPECTED_NEXT_VERSION) {
    throw new Error(
      `Next.js installed package is ${installedVersion}; expected exactly ${EXPECTED_NEXT_VERSION}`
    )
  }
}

export const assertActualNextVersion = () => {
  const packageJsonUrl = new URL("../package.json", import.meta.url)
  const manifest = JSON.parse(readFileSync(packageJsonUrl, "utf8"))
  const requireFromApp = createRequire(packageJsonUrl)
  const installed = requireFromApp("next/package.json")

  assertNextVersionValues({
    installedVersion: installed.version,
    manifestVersion: manifest.dependencies?.next,
  })

  return EXPECTED_NEXT_VERSION
}

const entrypoint = process.argv[1]
const isEntrypoint =
  entrypoint !== undefined &&
  pathToFileURL(resolve(entrypoint)).href ===
    pathToFileURL(fileURLToPath(import.meta.url)).href

if (isEntrypoint) {
  const version = assertActualNextVersion()
  process.stdout.write(`Verified Next.js ${version}\n`)
}
