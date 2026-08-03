import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"

const repositoryRoot = path.resolve(import.meta.dirname, "../..")
const projectsDirectory = path.join(import.meta.dirname, "projects")

const readJson = (filePath) => JSON.parse(readFileSync(filePath, "utf-8"))
// Committed Payload migrations are immutable generated history, but
// payload.config.ts imports ./migrations, so the strict wrapper substitutes a
// typed façade (src/migrations.strict.d.ts) via this exact suffix list instead
// of pulling generated implementations into the strict program.
const wrapperResolutionExceptions = new Map([
  [
    "scripts/typescript/projects/apps/payload/tsconfig.json",
    new Map([["moduleSuffixes", JSON.stringify([".strict", ""])]]),
  ],
])
const fail = (message) => {
  throw new Error(message)
}
const showConfig = (configPath) =>
  JSON.parse(
    execFileSync(
      path.join(repositoryRoot, "node_modules/.bin/tsc"),
      ["--showConfig", "-p", configPath],
      { cwd: repositoryRoot, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 }
    )
  )

const rootConfig = readJson(path.join(repositoryRoot, "tsconfig.json"))
for (const { path: referencePath } of rootConfig.references ?? []) {
  const wrapperPath = path.resolve(repositoryRoot, referencePath)
  const wrapper = readJson(wrapperPath)
  const sourcePath = path.resolve(
    path.dirname(wrapperPath),
    wrapper.extends.at(-1)
  )
  const source = showConfig(sourcePath).compilerOptions ?? {}
  const effective = showConfig(wrapperPath).compilerOptions ?? {}
  for (const option of [
    "baseUrl",
    "customConditions",
    "jsx",
    "lib",
    "module",
    "moduleResolution",
    "moduleSuffixes",
    "paths",
    "plugins",
    "rootDirs",
    "typeRoots",
    "types",
  ]) {
    const effectiveValue = JSON.stringify(effective[option])
    if (effectiveValue !== JSON.stringify(source[option])) {
      const allowedValue = wrapperResolutionExceptions
        .get(path.relative(repositoryRoot, wrapperPath))
        ?.get(option)
      if (allowedValue === undefined || effectiveValue !== allowedValue) {
        fail(
          `${path.relative(repositoryRoot, wrapperPath)} changes source compiler resolution option ${option}`
        )
      }
    }
  }
  if (!wrapperPath.startsWith(`${projectsDirectory}${path.sep}`)) {
    fail(
      `${path.relative(repositoryRoot, wrapperPath)} is outside wrapper directory`
    )
  }
}

console.log(
  `TypeScript resolution passed: ${rootConfig.references?.length ?? 0} wrappers preserve source module, JSX, library, path, plugin, and type settings.`
)
