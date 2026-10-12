import { statSync } from "node:fs"
import { access, glob, readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { validateCompoundDeclarations } from "./validate-compound-declarations.mjs"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const packageJson = JSON.parse(
  await readFile(resolve(packageRoot, "package.json"), "utf8")
)

let checkedTargets = 0
const publicTypeTargets = new Map()
const publicRuntimeTargets = new Map()

/**
 * @param {string} subpath concrete export subpath
 * @param {string} condition
 * @param {string} target concrete export target
 */
async function recordTarget(subpath, condition, target) {
  await access(resolve(packageRoot, target))
  checkedTargets += 1
  if (condition === "types") {
    if (!target.endsWith(".d.ts")) {
      throw new Error(
        `${subpath} has a non-declaration types target: ${target}`
      )
    }
    publicTypeTargets.set(subpath, target)
  } else if (condition === "import") {
    publicRuntimeTargets.set(subpath, target)
  }
}

for (const [subpath, conditions] of Object.entries(packageJson.exports)) {
  const targets = Object.entries(conditions).filter(
    ([, target]) => typeof target === "string"
  )
  const wildcardTargets = targets.filter(([, target]) => target.includes("*"))

  if (!(subpath.includes("*") && wildcardTargets.length > 0)) {
    for (const [condition, target] of targets) {
      await recordTarget(subpath, condition, target)
    }
    continue
  }

  const [referenceCondition, referenceTarget] =
    wildcardTargets.find(([condition]) => condition === "import") ??
    wildcardTargets[0]
  const matches = (
    await Array.fromAsync(glob(referenceTarget, { cwd: packageRoot }))
  ).filter((match) => !statSync(resolve(packageRoot, match)).isDirectory())

  if (matches.length === 0) {
    throw new Error(
      `${subpath} ${referenceCondition} pattern matched no files: ${referenceTarget}`
    )
  }

  const [prefix, suffix] = referenceTarget.split("*")
  for (const match of matches) {
    const normalizedMatch = `./${match.replaceAll("\\", "/")}`
    const wildcardValue = normalizedMatch.slice(prefix.length, -suffix.length)
    for (const [condition, target] of targets) {
      await recordTarget(
        subpath.replace("*", wildcardValue),
        condition,
        target.replace("*", wildcardValue)
      )
    }
  }
}

console.log(
  `Validated ${checkedTargets} concrete package export targets for ${packageJson.name}@${packageJson.version}.`
)

const { checkedComponents, checkedMembers } =
  await validateCompoundDeclarations(
    packageRoot,
    packageJson.name,
    publicTypeTargets,
    publicRuntimeTargets
  )

console.log(
  `Validated ${checkedMembers} public component members across ${checkedComponents} components from emitted declarations.`
)
