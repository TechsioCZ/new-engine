import { access, readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const packageJson = JSON.parse(
  await readFile(resolve(packageRoot, "package.json"), "utf8")
)

if (packageJson.exports?.["."] !== null) {
  throw new Error(
    "The package root must remain unexported; use explicit subpaths."
  )
}

if (packageJson.publishConfig?.access !== "public") {
  throw new Error("publishConfig.access must be public.")
}

if (packageJson.license !== "UNLICENSED") {
  throw new Error("The package must remain UNLICENSED.")
}

let checkedTargets = 0
for (const [subpath, conditions] of Object.entries(packageJson.exports)) {
  if (subpath === "." || subpath === "./package.json") {
    continue
  }

  for (const condition of ["types", "import", "require"]) {
    const target = conditions[condition]
    if (typeof target !== "string") {
      throw new Error(`${subpath} is missing its ${condition} target.`)
    }
    await access(resolve(packageRoot, target))
    checkedTargets += 1
  }
}

console.log(
  `Validated ${checkedTargets} ESM, CommonJS, and declaration targets for ${packageJson.name}@${packageJson.version}.`
)
