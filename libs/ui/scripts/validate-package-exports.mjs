import { access, readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { glob } from "glob"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const packageJson = JSON.parse(
  await readFile(resolve(packageRoot, "package.json"), "utf8")
)

let checkedTargets = 0

for (const [subpath, conditions] of Object.entries(packageJson.exports)) {
  const targets = Object.entries(conditions).filter(
    ([, target]) => typeof target === "string"
  )
  const wildcardTargets = targets.filter(([, target]) => target.includes("*"))

  if (subpath.includes("*") && wildcardTargets.length > 0) {
    const [referenceCondition, referenceTarget] =
      wildcardTargets.find(([condition]) => condition === "import") ??
      wildcardTargets[0]
    const matches = await glob(referenceTarget, {
      cwd: packageRoot,
      nodir: true,
    })

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
        const concreteTarget = target.replace("*", wildcardValue)
        await access(resolve(packageRoot, concreteTarget))
        checkedTargets += 1
        if (condition === "types" && !concreteTarget.endsWith(".d.ts")) {
          throw new Error(
            `${subpath} has a non-declaration types target: ${concreteTarget}`
          )
        }
      }
    }
    continue
  }

  for (const [condition, target] of targets) {
    await access(resolve(packageRoot, target))
    checkedTargets += 1
    if (condition === "types" && !target.endsWith(".d.ts")) {
      throw new Error(
        `${subpath} has a non-declaration types target: ${target}`
      )
    }
  }
}

console.log(
  `Validated ${checkedTargets} concrete package export targets for ${packageJson.name}@${packageJson.version}.`
)
