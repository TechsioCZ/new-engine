/// <reference types="node" />

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, realpathSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

/** @typedef {{ compiler: string, version: string }} CompilerResolution */

const defaultRepositoryRoot = path.resolve(import.meta.dirname, "../..")
const packageJsonName = "package.json"
const strictestPackageConfig = "@tsconfig/strictest/tsconfig.json"
const rootTypeScriptVersion = "7.0.2"
const isolatedCompilerVersion = "5.9.3"
const isolatedCompilerPackages = ["@medusajs/cli", "@medusajs/framework"]
const requiredBasePolicy = Object.freeze({
  forceConsistentCasingInFileNames: true,
  noUncheckedSideEffectImports: true,
})
const strictImpliedOptions = Object.freeze({
  alwaysStrict: true,
  noImplicitAny: true,
  noImplicitThis: true,
  strictBindCallApply: true,
  strictBuiltinIteratorReturn: true,
  strictFunctionTypes: true,
  strictNullChecks: true,
  strictPropertyInitialization: true,
  useUnknownInCatchVariables: true,
})
const nonPolicyPresetOptions = new Set([
  "esModuleInterop",
  "isolatedModules",
  "skipLibCheck",
])
const migrationPattern = /(?:^|\/)migrations\/.*\.ts$/u
const generatedOutputPatterns = [
  /(?:^|\/)dist(?:\/|$)/u,
  /(?:^|\/)storybook-static(?:\/|$)/u,
  /(?:^|\/)__admin-extensions__\.js$/u,
]
const tsconfigNamePattern = /^tsconfig(?:\.[^.]+)*\.json$/u

/** @param {string} message @returns {never} */
const fail = (message) => {
  throw new Error(message)
}

/** @param {unknown} value @returns {value is object} */
const isObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** @param {object} object @param {string} key @returns {unknown} */
const readProperty = (object, key) =>
  Object.getOwnPropertyDescriptor(object, key)?.value

/** @param {string} text @param {string} source @returns {object} */
const parseObject = (text, source) => {
  /** @type {unknown} */
  const value = JSON.parse(text)
  return isObject(value) ? value : fail(`${source} must contain a JSON object`)
}

/** @param {string} filePath @returns {object} */
const readJson = (filePath) =>
  parseObject(readFileSync(filePath, "utf-8"), filePath)

/** @param {object} object @param {string} key @returns {object} */
const readOptionalObject = (object, key) => {
  const value = readProperty(object, key)
  if (value === undefined) {
    return {}
  }
  return isObject(value) ? value : fail(`${key} must be an object`)
}

/** @param {object} object @param {string} key @returns {string[]} */
const readOptionalStringArray = (object, key) => {
  const value = readProperty(object, key)
  if (value === undefined) {
    return []
  }
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : fail(`${key} must be an array of strings`)
}

/** @param {object} config @returns {string[]} */
const readExtends = (config) => {
  const value = readProperty(config, "extends")
  if (typeof value === "string") {
    return [value]
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value
  }
  return value === undefined
    ? []
    : fail("extends must be a string or an array of strings")
}

/** @param {object} config @returns {string[]} */
const readReferencePaths = (config) => {
  const { references } = config
  if (!Array.isArray(references)) {
    return fail("tsconfig.json references must be an array")
  }
  return references.map((reference) =>
    isObject(reference) && typeof readProperty(reference, "path") === "string"
      ? readProperty(reference, "path")
      : fail("each TypeScript reference must have a string path"),
  )
}

/** @param {string} repositoryRoot @param {string} filePath @returns {string} */
const relative = (repositoryRoot, filePath) =>
  path.relative(repositoryRoot, filePath).replaceAll(path.sep, "/")

/** @param {string} repositoryRoot @param {string} filePath @returns {boolean} */
const isWithinRepository = (repositoryRoot, filePath) => {
  const repositoryRelativePath = path.relative(repositoryRoot, filePath)
  return (
    repositoryRelativePath === "" ||
    (!repositoryRelativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(repositoryRelativePath))
  )
}

/**
 * @param {string} repositoryRoot - Real repository root.
 * @param {string} configPath - Extending config path.
 * @param {string} reference - Raw extends reference.
 * @param {boolean} allowOutside - Whether package resolution may leave the fixture root.
 * @returns {string} Resolved real config path.
 */
const resolveConfigReference = (
  repositoryRoot,
  configPath,
  reference,
  allowOutside,
) => {
  let lexicalPath
  if (reference.startsWith(".") || path.isAbsolute(reference)) {
    lexicalPath = path.resolve(path.dirname(configPath), reference)
    if (!isWithinRepository(repositoryRoot, lexicalPath)) {
      fail(
        `${relative(repositoryRoot, configPath)} extends outside the repository: ${reference}`,
      )
    }
  } else {
    try {
      lexicalPath = createRequire(configPath).resolve(reference)
    } catch {
      return fail(
        `${relative(repositoryRoot, configPath)} cannot resolve extends ${reference}`,
      )
    }
  }
  if (!existsSync(lexicalPath)) {
    return fail(
      `${relative(repositoryRoot, configPath)} extends missing config ${reference}`,
    )
  }
  const resolvedPath = realpathSync(lexicalPath)
  if (!allowOutside && !isWithinRepository(repositoryRoot, resolvedPath)) {
    fail(
      `${relative(repositoryRoot, configPath)} extends outside the repository: ${reference}`,
    )
  }
  return resolvedPath
}

/** @param {string} repositoryRoot @returns {string[]} */
const collectAuthoredTsconfigs = (repositoryRoot) => {
  const output = execFileSync(
    "/usr/bin/git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: repositoryRoot, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
  )
  return output
    .split("\0")
    .filter(Boolean)
    .filter((filePath) => tsconfigNamePattern.test(path.basename(filePath)))
    .map((filePath) => path.resolve(repositoryRoot, filePath))
    .filter(existsSync)
    .map((filePath) => {
      const realPath = realpathSync(filePath)
      if (!isWithinRepository(repositoryRoot, realPath)) {
        fail(
          `${relative(repositoryRoot, filePath)} resolves outside the repository`,
        )
      }
      return realPath
    })
}

/** @param {string} repositoryRoot @param {string} configPath */
const showConfig = (repositoryRoot, configPath) =>
  parseObject(
    execFileSync(
      path.join(repositoryRoot, "node_modules/.bin/tsc"),
      ["--showConfig", "-p", configPath],
      {
        cwd: repositoryRoot,
        encoding: "utf-8",
        maxBuffer: 64 * 1024 * 1024,
      },
    ),
    `tsc --showConfig for ${relative(repositoryRoot, configPath)}`,
  )

/** @param {string} packageName @param {string} repositoryRoot @returns {string} */
const resolvePackageJson = (packageName, repositoryRoot) => {
  const requireFromRoot = createRequire(
    path.join(repositoryRoot, packageJsonName),
  )
  let directory = path.dirname(requireFromRoot.resolve(packageName))
  while (directory !== path.dirname(directory)) {
    const packageJson = path.join(directory, "package.json")
    if (
      existsSync(packageJson) &&
      Reflect.get(readJson(packageJson), "name") === packageName
    ) {
      return realpathSync(packageJson)
    }
    directory = path.dirname(directory)
  }
  return fail(`Cannot locate ${packageName}/package.json`)
}

/** @param {string} packageJsonPath @returns {CompilerResolution} */
const resolveTypeScriptFrom = (packageJsonPath) => {
  const script = [
    "const { createRequire } = require('node:module')",
    `const anchor = createRequire(${JSON.stringify(packageJsonPath)})`,
    "const compiler = anchor.resolve('typescript/package.json')",
    "const version = anchor('typescript/package.json').version",
    "process.stdout.write(JSON.stringify({ compiler: require('node:fs').realpathSync(compiler), version }))",
  ].join(";")
  const result = parseObject(
    execFileSync(process.execPath, ["-e", script], { encoding: "utf-8" }),
    `TypeScript resolution for ${packageJsonPath}`,
  )
  const compiler = readProperty(result, "compiler")
  const version = readProperty(result, "version")
  return typeof compiler === "string" && typeof version === "string"
    ? { compiler, version }
    : fail(
        `TypeScript resolution for ${packageJsonPath} returned invalid output`,
      )
}

/**
 * @param {string} repositoryRoot - Real repository root.
 * @param {string} baseConfigPath - Base configuration path.
 * @param {string[]} authoredConfigs - Authored configuration paths.
 * @returns {{ configs: Map<string, object>, parents: Map<string, string[]> }} Loaded graph.
 */
const loadConfigGraph = (repositoryRoot, baseConfigPath, authoredConfigs) => {
  /** @type {Map<string, object>} */
  const configs = new Map()
  /** @type {Map<string, string[]>} */
  const parents = new Map()
  /** @param {string} configPath - Config path to load. @returns {object} Loaded config. */
  const loadConfig = (configPath) => {
    const cached = configs.get(configPath)
    if (cached !== undefined) {
      return cached
    }
    const config = readJson(configPath)
    configs.set(configPath, config)
    const resolvedParents = readExtends(config).map((reference) =>
      resolveConfigReference(
        repositoryRoot,
        configPath,
        reference,
        configPath === baseConfigPath && reference === strictestPackageConfig,
      ),
    )
    parents.set(configPath, resolvedParents)
    for (const parent of resolvedParents) {
      loadConfig(parent)
    }
    return config
  }
  for (const configPath of authoredConfigs) {
    loadConfig(configPath)
  }
  return { configs, parents }
}

/** @param {Map<string, object>} configs @param {string} configPath @returns {object} */
const getLoadedConfig = (configs, configPath) =>
  configs.get(configPath) ?? fail(`Configuration was not loaded: ${configPath}`)

/**
 * @param {string} repositoryRoot - Real repository root.
 * @param {string[]} authoredConfigs - Authored configuration paths.
 * @param {Map<string, string[]>} parents - Resolved parent graph.
 */
const validateAcyclicGraph = (repositoryRoot, authoredConfigs, parents) => {
  /** @type {Set<string>} */
  const visited = new Set()
  /** @type {Set<string>} */
  const visiting = new Set()
  /** @param {string} configPath - Config path to visit. @returns {void} */
  const visit = (configPath) => {
    if (visiting.has(configPath)) {
      fail(
        `TypeScript config inheritance cycle reaches ${relative(repositoryRoot, configPath)}`,
      )
    }
    if (visited.has(configPath)) {
      return
    }
    visiting.add(configPath)
    for (const parent of parents.get(configPath) ?? []) {
      visit(parent)
    }
    visiting.delete(configPath)
    visited.add(configPath)
  }
  for (const configPath of authoredConfigs) {
    visit(configPath)
  }
}

/**
 * @param {string} repositoryRoot - Real repository root.
 * @param {string} baseConfigPath - Base configuration path.
 * @param {string[]} authoredConfigs - Authored configuration paths.
 * @param {Map<string, string[]>} parents - Resolved parent graph.
 */
const validateBaseAncestry = (
  repositoryRoot,
  baseConfigPath,
  authoredConfigs,
  parents,
) => {
  /** @type {Map<string, boolean>} */
  const ancestry = new Map()
  /** @param {string} configPath - Config path to inspect. @returns {boolean} Base ancestry. */
  const inheritsBase = (configPath) => {
    if (configPath === baseConfigPath) {
      return true
    }
    const cached = ancestry.get(configPath)
    if (cached !== undefined) {
      return cached
    }
    const result = (parents.get(configPath) ?? []).some(inheritsBase)
    ancestry.set(configPath, result)
    return result
  }
  for (const configPath of authoredConfigs) {
    if (configPath !== baseConfigPath && !inheritsBase(configPath)) {
      fail(
        `${relative(repositoryRoot, configPath)} is missing tsconfig.base.json ancestry`,
      )
    }
  }
}

/**
 * @param {string} repositoryRoot - Real repository root.
 * @param {string} baseConfigPath - Base configuration path.
 * @param {string} projectsDirectory - Wrapper directory.
 * @param {string[]} authoredConfigs - Authored configuration paths.
 * @param {Set<string>} wrapperSet - Wrapper paths.
 * @param {Map<string, string[]>} parents - Resolved parent graph.
 */
const validateDirectInheritance = (
  repositoryRoot,
  baseConfigPath,
  projectsDirectory,
  authoredConfigs,
  wrapperSet,
  parents,
) => {
  for (const configPath of authoredConfigs) {
    if (configPath === baseConfigPath) {
      continue
    }
    const resolvedParents = parents.get(configPath) ?? []
    if (wrapperSet.has(configPath)) {
      const expectedSource = realpathSync(
        path.join(repositoryRoot, path.relative(projectsDirectory, configPath)),
      )
      if (
        resolvedParents.length !== 1 ||
        resolvedParents[0] !== expectedSource
      ) {
        fail(
          `${relative(repositoryRoot, configPath)} must extend exactly its mirrored source config`,
        )
      }
    } else if (
      resolvedParents.length !== 1 ||
      resolvedParents[0] !== baseConfigPath
    ) {
      fail(
        `${relative(repositoryRoot, configPath)} must extend tsconfig.base.json directly`,
      )
    }
  }
}

/**
 * @param {object} baseConfig - Parsed base configuration.
 * @param {object} strictestConfig - Parsed strictest preset.
 * @returns {{ effectivePolicy: object, strictPolicy: object }} Validated policy layers.
 */
const buildPolicies = (baseConfig, strictestConfig) => {
  const strictestOptions = readOptionalObject(
    strictestConfig,
    "compilerOptions",
  )
  const presetPolicy = Object.fromEntries(
    Object.entries(strictestOptions).filter(
      ([option]) => !nonPolicyPresetOptions.has(option),
    ),
  )
  const effectivePolicy = {
    ...presetPolicy,
    ...requiredBasePolicy,
  }
  const strictPolicy = {
    ...effectivePolicy,
    ...strictImpliedOptions,
  }
  const baseOptions = readOptionalObject(baseConfig, "compilerOptions")
  for (const [option, expected] of Object.entries(presetPolicy)) {
    if (Reflect.get(baseOptions, option) !== undefined) {
      fail(
        `tsconfig.base.json unnecessarily duplicates strict preset option ${option}`,
      )
    }
    if (
      Reflect.get(strictImpliedOptions, option) !== undefined &&
      Reflect.get(strictImpliedOptions, option) !== expected
    ) {
      fail(`strict preset has inconsistent ${option}`)
    }
  }
  for (const option of Object.keys(strictImpliedOptions)) {
    if (Reflect.get(baseOptions, option) !== undefined) {
      fail(
        `tsconfig.base.json unnecessarily duplicates strict-implied option ${option}`,
      )
    }
  }
  for (const [option, expected] of Object.entries(requiredBasePolicy)) {
    if (Reflect.get(baseOptions, option) !== expected) {
      fail(`tsconfig.base.json must set ${option}=${JSON.stringify(expected)}`)
    }
  }
  return { effectivePolicy, strictPolicy }
}

/**
 * @param {string} repositoryRoot - Real repository root.
 * @param {string} baseConfigPath - Base configuration path.
 * @param {string[]} authoredConfigs - Authored configuration paths.
 * @param {Map<string, object>} configs - Parsed configurations.
 * @param {object} effectivePolicy - Required effective settings.
 * @param {object} strictPolicy - Settings authored configs cannot override.
 */
const validateConfigPolicies = (
  repositoryRoot,
  baseConfigPath,
  authoredConfigs,
  configs,
  effectivePolicy,
  strictPolicy,
) => {
  for (const configPath of authoredConfigs) {
    if (configPath !== baseConfigPath) {
      const ownOptions = readOptionalObject(
        getLoadedConfig(configs, configPath),
        "compilerOptions",
      )
      for (const [option, expected] of Object.entries(strictPolicy)) {
        if (Reflect.get(ownOptions, option) === expected) {
          fail(
            `${relative(repositoryRoot, configPath)} unnecessarily duplicates strict option ${option}`,
          )
        }
        if (Reflect.get(ownOptions, option) !== undefined) {
          fail(
            `${relative(repositoryRoot, configPath)} weakens strict option ${option}`,
          )
        }
      }
    }
    const effectiveOptions = readOptionalObject(
      showConfig(repositoryRoot, configPath),
      "compilerOptions",
    )
    for (const [option, expected] of Object.entries(effectivePolicy)) {
      if (Reflect.get(effectiveOptions, option) !== expected) {
        fail(
          `${relative(repositoryRoot, configPath)} weakens strict option ${option}; expected ${JSON.stringify(expected)}`,
        )
      }
    }
  }
}

/**
 * @param {string} repositoryRoot - Real repository root.
 * @param {string} projectsDirectory - Wrapper directory.
 * @param {object} rootConfig - Parsed root configuration.
 * @param {string[]} sourceConfigs - Authored source configurations.
 * @param {string[]} wrapperConfigs - Mirrored wrapper configurations.
 * @param {Set<string>} wrapperSet - Wrapper paths.
 */
const validateWrapperCoverage = (
  repositoryRoot,
  projectsDirectory,
  rootConfig,
  sourceConfigs,
  wrapperConfigs,
  wrapperSet,
) => {
  const referencedWrappers = new Set(
    readReferencePaths(rootConfig).map((reference) => {
      const lexicalPath = path.resolve(repositoryRoot, reference)
      if (
        !isWithinRepository(repositoryRoot, lexicalPath) ||
        !existsSync(lexicalPath)
      ) {
        return fail(
          `tsconfig.json references invalid or outside project: ${reference}`,
        )
      }
      return realpathSync(lexicalPath)
    }),
  )
  if (
    referencedWrappers.size !== wrapperSet.size ||
    wrapperConfigs.some((wrapper) => !referencedWrappers.has(wrapper)) ||
    [...referencedWrappers].some((wrapper) => !wrapperSet.has(wrapper))
  ) {
    fail("tsconfig.json references must exactly cover every mirrored wrapper")
  }
  for (const sourceConfig of sourceConfigs) {
    const expectedWrapper = path.join(
      projectsDirectory,
      relative(repositoryRoot, sourceConfig),
    )
    if (!wrapperSet.has(expectedWrapper)) {
      fail(
        `${relative(repositoryRoot, sourceConfig)} is an unmirrored shadow config`,
      )
    }
  }
  if (sourceConfigs.length !== wrapperConfigs.length) {
    fail(
      "mirrored wrapper count must exactly match authored source config count",
    )
  }
}

/** @param {string} repositoryRoot @param {string[]} wrapperConfigs */
const validateWrapperFiles = (repositoryRoot, wrapperConfigs) => {
  for (const wrapper of wrapperConfigs) {
    const files = readOptionalStringArray(
      showConfig(repositoryRoot, wrapper),
      "files",
    )
    for (const file of files) {
      const normalizedFile = file.replaceAll(path.sep, "/")
      if (migrationPattern.test(normalizedFile)) {
        fail(
          `${relative(repositoryRoot, wrapper)} includes immutable migration ${normalizedFile}`,
        )
      }
      if (
        generatedOutputPatterns.some((pattern) => pattern.test(normalizedFile))
      ) {
        fail(
          `${relative(repositoryRoot, wrapper)} includes generated output ${normalizedFile}`,
        )
      }
    }
  }
}

/** @param {string} repositoryRoot - Real repository root. */
const validateCompilerResolution = (repositoryRoot) => {
  const rootCompiler = resolveTypeScriptFrom(
    path.join(repositoryRoot, packageJsonName),
  )
  if (rootCompiler.version !== rootTypeScriptVersion) {
    fail(`Root TypeScript must resolve to ${rootTypeScriptVersion}`)
  }
  for (const packageName of isolatedCompilerPackages) {
    const compiler = resolveTypeScriptFrom(
      resolvePackageJson(packageName, repositoryRoot),
    )
    if (compiler.version !== isolatedCompilerVersion) {
      fail(
        `${packageName} must resolve TypeScript ${isolatedCompilerVersion}, got ${compiler.version}`,
      )
    }
    if (compiler.compiler === rootCompiler.compiler) {
      fail(`${packageName} must not resolve the root TypeScript compiler`)
    }
  }
}

/**
 * @param {{ repositoryRoot?: string, verifyCompilerResolution?: boolean }} [options] - Audit options.
 * @returns {{ sourceConfigCount: number, wrapperCount: number }} Audited source and wrapper counts.
 */
export const auditRepository = ({
  repositoryRoot: requestedRepositoryRoot = defaultRepositoryRoot,
  verifyCompilerResolution = true,
} = {}) => {
  const repositoryRoot = realpathSync(requestedRepositoryRoot)
  const baseConfigPath = path.join(repositoryRoot, "tsconfig.base.json")
  const rootConfigPath = path.join(repositoryRoot, "tsconfig.json")
  const projectsDirectory = path.join(
    repositoryRoot,
    "scripts/typescript/projects",
  )
  const authoredConfigs = collectAuthoredTsconfigs(repositoryRoot)
  const authoredSet = new Set(authoredConfigs)
  for (const requiredPath of [baseConfigPath, rootConfigPath]) {
    if (!authoredSet.has(requiredPath)) {
      fail(`${relative(repositoryRoot, requiredPath)} must be authored`)
    }
  }

  const { configs, parents } = loadConfigGraph(
    repositoryRoot,
    baseConfigPath,
    authoredConfigs,
  )
  const baseConfig = getLoadedConfig(configs, baseConfigPath)
  validateAcyclicGraph(repositoryRoot, authoredConfigs, parents)

  const baseReferences = readExtends(baseConfig)
  if (
    baseReferences.length !== 1 ||
    baseReferences[0] !== strictestPackageConfig
  ) {
    fail(`tsconfig.base.json must extend ${strictestPackageConfig} directly`)
  }
  const strictestConfigPath = parents.get(baseConfigPath)?.[0]
  if (strictestConfigPath === undefined) {
    return fail("tsconfig.base.json did not resolve the strictest preset")
  }

  validateBaseAncestry(repositoryRoot, baseConfigPath, authoredConfigs, parents)
  const wrapperConfigs = authoredConfigs.filter((configPath) =>
    configPath.startsWith(`${projectsDirectory}${path.sep}`),
  )
  const wrapperSet = new Set(wrapperConfigs)
  const sourceConfigs = authoredConfigs.filter(
    (configPath) =>
      configPath !== baseConfigPath &&
      configPath !== rootConfigPath &&
      !wrapperSet.has(configPath),
  )
  validateDirectInheritance(
    repositoryRoot,
    baseConfigPath,
    projectsDirectory,
    authoredConfigs,
    wrapperSet,
    parents,
  )

  const { effectivePolicy, strictPolicy } = buildPolicies(
    baseConfig,
    getLoadedConfig(configs, strictestConfigPath),
  )
  validateConfigPolicies(
    repositoryRoot,
    baseConfigPath,
    authoredConfigs,
    configs,
    effectivePolicy,
    strictPolicy,
  )
  validateWrapperCoverage(
    repositoryRoot,
    projectsDirectory,
    getLoadedConfig(configs, rootConfigPath),
    sourceConfigs,
    wrapperConfigs,
    wrapperSet,
  )
  validateWrapperFiles(repositoryRoot, wrapperConfigs)

  if (verifyCompilerResolution) {
    validateCompilerResolution(repositoryRoot)
  }
  return {
    sourceConfigCount: sourceConfigs.length,
    wrapperCount: wrapperConfigs.length,
  }
}

const [, invokedPath] = process.argv
if (
  invokedPath !== undefined &&
  realpathSync(invokedPath) === realpathSync(import.meta.filename)
) {
  const result = auditRepository()
  console.log(
    `TypeScript audit passed: ${result.sourceConfigCount} authored source configs have exact mirrored wrappers and inherit ${strictestPackageConfig} through tsconfig.base.json.`,
  )
}
