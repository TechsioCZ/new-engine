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

const requiredSubpaths = [
  "./client/provider",
  "./server/get-query-client",
  "./shared/region",
  "./shared/region-context",
  "./medusa/preset",
  "./medusa/server-read",
]

for (const subpath of requiredSubpaths) {
  if (!packageJson.exports[subpath]) {
    throw new Error(`Missing required public export: ${subpath}`)
  }
}

let checkedTargets = 0
for (const [subpath, conditions] of Object.entries(packageJson.exports)) {
  if (subpath === "." || subpath === "./package.json") {
    continue
  }

  for (const condition of ["types", "import"]) {
    const target = conditions[condition]
    if (typeof target !== "string") {
      throw new Error(`${subpath} is missing its ${condition} target.`)
    }
    if (target.includes("/src/")) {
      throw new Error(
        `${subpath} exposes a stale source-based target: ${target}`
      )
    }
    await access(resolve(packageRoot, target))
    checkedTargets += 1
  }
}

console.log(
  `Validated ${checkedTargets} built export targets for ${packageJson.name}@${packageJson.version}.`
)
