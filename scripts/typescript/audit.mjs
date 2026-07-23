import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, realpathSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repositoryRoot = path.resolve(import.meta.dirname, "../..")
const projectsDirectory = path.join(import.meta.dirname, "projects")
const rootTypeScriptVersion = "7.0.2"
const isolatedCompilerVersion = "5.9.3"
const isolatedCompilerPackages = ["@medusajs/cli", "@medusajs/framework"]
const strictConfigPath = realpathSync(
  path.join(repositoryRoot, "tsconfig.strict.json")
)
const requiredStrictOptions = new Set([
  "allowUnreachableCode",
  "allowUnusedLabels",
  "alwaysStrict",
  "exactOptionalPropertyTypes",
  "forceConsistentCasingInFileNames",
  "noFallthroughCasesInSwitch",
  "noImplicitAny",
  "noImplicitOverride",
  "noImplicitReturns",
  "noImplicitThis",
  "noPropertyAccessFromIndexSignature",
  "noUncheckedIndexedAccess",
  "noUncheckedSideEffectImports",
  "noUnusedLocals",
  "noUnusedParameters",
  "strict",
  "strictBindCallApply",
  "strictBuiltinIteratorReturn",
  "strictFunctionTypes",
  "strictNullChecks",
  "strictPropertyInitialization",
  "useUnknownInCatchVariables",
])
const falseStrictOptions = new Set([
  "allowUnreachableCode",
  "allowUnusedLabels",
])
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".nx",
  ".turbo",
  "dist",
  "local",
  "node_modules",
  "out",
])

const fail = (message) => {
  throw new Error(message)
}
const readJson = (filePath) => JSON.parse(readFileSync(filePath, "utf-8"))
const relative = (filePath) => path.relative(repositoryRoot, filePath)
const migrationPattern = /(?:^|\/)migrations\/.*\.ts$/u
const generatedOutputPatterns = [
  /(?:^|\/)dist(?:\/|$)/u,
  /(?:^|\/)storybook-static(?:\/|$)/u,
  /(?:^|\/)__admin-extensions__\.js$/u,
]
const normalizePath = (filePath) => filePath.replaceAll(path.sep, "/")

const collectTsconfigs = (directory) => {
  const result = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) {
      continue
    }
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      result.push(...collectTsconfigs(entryPath))
    } else if (/^tsconfig(?:\.[^.]+)*\.json$/u.test(entry.name)) {
      result.push(entryPath)
    }
  }
  return result
}

const resolveConfigReference = (configPath, reference) =>
  realpathSync(path.resolve(path.dirname(configPath), reference))

const resolvePackageJson = (packageName) => {
  const packageEntry = import.meta.resolve(packageName)
  let directory = path.dirname(fileURLToPath(packageEntry))
  while (directory !== path.dirname(directory)) {
    const packageJson = path.join(directory, "package.json")
    if (existsSync(packageJson) && readJson(packageJson).name === packageName) {
      return realpathSync(packageJson)
    }
    directory = path.dirname(directory)
  }
  return fail(`Cannot locate ${packageName}/package.json`)
}

const resolveTypeScriptFrom = (packageJsonPath) => {
  const requireScript = [
    "const { createRequire } = require('node:module')",
    `const requireFromPackage = createRequire(${JSON.stringify(packageJsonPath)})`,
    "const compiler = requireFromPackage.resolve('typescript/package.json')",
    "const version = requireFromPackage('typescript/package.json').version",
    "process.stdout.write(JSON.stringify({ compiler: require('node:fs').realpathSync(compiler), version }))",
  ].join(";")
  return JSON.parse(
    execFileSync(process.execPath, ["-e", requireScript], { encoding: "utf-8" })
  )
}

const showConfig = (configPath) =>
  JSON.parse(
    execFileSync(
      path.join(repositoryRoot, "node_modules/.bin/tsc"),
      ["--showConfig", "-p", configPath],
      { cwd: repositoryRoot, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 }
    )
  )

const strictConfig = readJson(strictConfigPath)
const strictOptions = strictConfig.compilerOptions ?? {}
if (strictConfig.extends !== undefined) {
  fail(
    "tsconfig.strict.json must be policy-only and must not extend another config"
  )
}
for (const option of requiredStrictOptions) {
  const expected = !falseStrictOptions.has(option)
  if (strictOptions[option] !== expected) {
    fail(`tsconfig.strict.json must set ${option} to ${expected}`)
  }
}

const rootConfigPath = path.join(repositoryRoot, "tsconfig.json")
const rootConfig = readJson(rootConfigPath)
const referencedWrappers = new Set(
  (rootConfig.references ?? []).map(({ path: referencePath }) =>
    resolveConfigReference(rootConfigPath, referencePath)
  )
)
const wrapperConfigs = collectTsconfigs(projectsDirectory).map((filePath) =>
  realpathSync(filePath)
)
const wrappedSources = new Set()

for (const wrapper of wrapperConfigs) {
  if (!referencedWrappers.has(wrapper)) {
    fail(`${relative(wrapper)} is not referenced by tsconfig.json`)
  }
  const config = readJson(wrapper)
  if (!Array.isArray(config.extends) || config.extends.length !== 2) {
    fail(`${relative(wrapper)} must extend strict policy and one source config`)
  }
  const firstConfig = resolveConfigReference(wrapper, config.extends[0])
  const sourceConfig = resolveConfigReference(wrapper, config.extends[1])
  if (firstConfig !== strictConfigPath) {
    fail(`${relative(wrapper)} must apply tsconfig.strict.json first`)
  }
  if (!sourceConfig.startsWith(`${repositoryRoot}${path.sep}`)) {
    fail(`${relative(wrapper)} resolves outside the repository`)
  }
  if (sourceConfig.startsWith(`${projectsDirectory}${path.sep}`)) {
    fail(`${relative(wrapper)} must wrap a source config, not another wrapper`)
  }
  wrappedSources.add(sourceConfig)

  const wrapperOptions = config.compilerOptions ?? {}
  for (const option of requiredStrictOptions) {
    const expected = !falseStrictOptions.has(option)
    if (wrapperOptions[option] !== expected) {
      fail(`${relative(wrapper)} must pin ${option}=${expected}`)
    }
  }

  const effectiveConfig = showConfig(wrapper)
  const effectiveOptions = effectiveConfig.compilerOptions ?? {}
  for (const option of requiredStrictOptions) {
    const expected = !falseStrictOptions.has(option)
    if (effectiveOptions[option] !== expected) {
      fail(`${relative(wrapper)} does not enforce ${option}=${expected}`)
    }
  }
  for (const file of effectiveConfig.files ?? []) {
    const normalizedFile = normalizePath(file)
    if (migrationPattern.test(normalizedFile)) {
      fail(
        `${relative(wrapper)} includes immutable migration ${normalizedFile}`
      )
    }
    if (
      generatedOutputPatterns.some((pattern) => pattern.test(normalizedFile))
    ) {
      fail(`${relative(wrapper)} includes generated output ${normalizedFile}`)
    }
  }
}
for (const reference of referencedWrappers) {
  if (!wrapperConfigs.includes(reference)) {
    fail(`${relative(reference)} is missing`)
  }
}

const sourceConfigs = collectTsconfigs(repositoryRoot).filter(
  (filePath) =>
    !filePath.startsWith(projectsDirectory) &&
    filePath !== rootConfigPath &&
    filePath !== path.join(repositoryRoot, "tsconfig.base.json") &&
    filePath !== path.join(repositoryRoot, "tsconfig.strict.json")
)
for (const sourceConfig of sourceConfigs) {
  const realSourceConfig = realpathSync(sourceConfig)
  if (!wrappedSources.has(realSourceConfig)) {
    fail(`${relative(sourceConfig)} has no root typecheck wrapper`)
  }
  // Source configs may describe framework defaults; wrappers are the authoritative
  // root TS7 policy and are audited above after all inheritance has resolved.
}

const rootCompiler = resolveTypeScriptFrom(
  path.join(repositoryRoot, "package.json")
)
if (rootCompiler.version !== rootTypeScriptVersion) {
  fail(`Root TypeScript must resolve to ${rootTypeScriptVersion}`)
}
for (const packageName of isolatedCompilerPackages) {
  const compiler = resolveTypeScriptFrom(resolvePackageJson(packageName))
  if (compiler.version !== isolatedCompilerVersion) {
    fail(
      `${packageName} must resolve TypeScript ${isolatedCompilerVersion}, got ${compiler.version}`
    )
  }
  if (compiler.compiler === rootCompiler.compiler) {
    fail(`${packageName} must not resolve the root TypeScript compiler`)
  }
}

console.log(
  `TypeScript audit passed: ${wrappedSources.size} source configs enforce root ${rootCompiler.version} strict policy; Medusa compilers use ${isolatedCompilerVersion}.`
)
