/// <reference types="node" />

const fs = require("node:fs")
const path = require("node:path")

/**
 * @param {unknown} value - Candidate value read from untrusted JSON.
 * @returns {value is string[]} Whether the value is a non-empty all-string array.
 */
const isNonEmptyStringArray = (value) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => typeof item === "string")

/**
 * Reads a `tags` array from Nx metadata, treating JSON as untrusted input.
 * @param {unknown} metadata - Candidate Nx metadata.
 * @returns {readonly string[] | null} Valid tags, when present.
 */
const readNxTags = (metadata) => {
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    !("tags" in metadata)
  ) {
    return null
  }

  return isNonEmptyStringArray(metadata.tags) ? metadata.tags : null
}

/**
 * Reads `nx.tags` from package.json, treating JSON as untrusted input.
 * @param {unknown} metadata - Parsed package.json document.
 * @returns {readonly string[] | null} Valid package-level Nx tags.
 */
const readPackageNxTags = (metadata) => {
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    !("nx" in metadata)
  ) {
    return null
  }

  return readNxTags(metadata.nx)
}

/**
 * @param {readonly string[]} left - First tag collection.
 * @param {readonly string[]} right - Second tag collection.
 * @returns {boolean} Whether both collections contain the same tags.
 */
const haveSameTags = (left, right) => {
  const leftTags = new Set(left)
  const rightTags = new Set(right)
  return (
    leftTags.size === rightTags.size &&
    [...leftTags].every((tag) => rightTags.has(tag))
  )
}

/**
 * @param {string} filePath - JSON file to parse.
 * @returns {unknown} Parsed untrusted JSON.
 */
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf-8"))

/**
 * @param {string} projectRoot - Workspace-relative project root.
 * @param {readonly string[] | null} primaryTags - Authoritative manifest tags.
 * @param {readonly string[] | undefined} comparisonTags - Tags that must agree.
 * @param {string} comparisonSource - Description used in disagreement errors.
 * @returns {void}
 */
const assertTagParity = (
  projectRoot,
  primaryTags,
  comparisonTags,
  comparisonSource,
) => {
  if (
    primaryTags !== null &&
    comparisonTags !== undefined &&
    !haveSameTags(primaryTags, comparisonTags)
  ) {
    throw new Error(
      `${projectRoot} Nx tags disagree with ${comparisonSource}: ${primaryTags.join(", ")} !== ${comparisonTags.join(", ")}`,
    )
  }
}

/**
 * Classifies one workspace project directory from project.json, package.json,
 * or the explicit fallback used for manifest-less projects.
 * @param {object} input - Project classification inputs.
 * @param {string} input.workspaceFolder - Top-level folder (`apps` or `libs`).
 * @param {string} input.absoluteFolder - Absolute top-level folder path.
 * @param {import("node:fs").Dirent} input.entry - Directory entry to classify.
 * @param {Readonly<Record<string, readonly string[]>>} input.fallbackTags - Explicit fallback tags.
 * @returns {{ root: string, tags: readonly string[] } | null} Classification.
 */
const resolveProject = ({
  absoluteFolder,
  entry,
  fallbackTags,
  workspaceFolder,
}) => {
  const projectRoot = `${workspaceFolder}/${entry.name}`
  const packageJson = path.join(absoluteFolder, entry.name, "package.json")
  const projectJson = path.join(absoluteFolder, entry.name, "project.json")
  const fallback = fallbackTags[projectRoot]
  const hasPackageJson = fs.existsSync(packageJson)
  const hasProjectJson = fs.existsSync(projectJson)

  if (
    !(hasPackageJson || hasProjectJson) &&
    (fallback === undefined || fallback.length === 0)
  ) {
    return null
  }

  const projectTags = hasProjectJson ? readNxTags(readJson(projectJson)) : null
  const packageTags = hasPackageJson
    ? readPackageNxTags(readJson(packageJson))
    : null

  assertTagParity(
    projectRoot,
    projectTags,
    packageTags ?? undefined,
    "package.json",
  )

  const manifestTags = projectTags ?? packageTags
  assertTagParity(
    projectRoot,
    manifestTags,
    fallback,
    "dependency-cruiser fallback",
  )

  const tags = manifestTags ?? fallback
  if (tags === undefined || tags.length === 0) {
    throw new Error(
      `${projectRoot} needs Nx tags or a dependency-cruiser fallback classification`,
    )
  }

  return { root: projectRoot, tags }
}

/**
 * Reads tagged projects below the configured workspace folders.
 * @param {string} workspaceRoot - Absolute workspace root.
 * @param {object} options - Project discovery options.
 * @param {Readonly<Record<string, readonly string[]>>} options.fallbackTags - Explicit fallback tags.
 * @param {readonly string[]} [options.workspaceFolders] - Workspace folders.
 * @returns {{ root: string, tags: readonly string[] }[]} Project classifications.
 */
const readProjects = (
  workspaceRoot,
  { fallbackTags, workspaceFolders = ["apps", "libs"] },
) => {
  /** @type {{ root: string, tags: readonly string[] }[]} */
  const projects = []

  for (const workspaceFolder of workspaceFolders) {
    const absoluteFolder = path.join(workspaceRoot, workspaceFolder)
    for (const entry of fs.readdirSync(absoluteFolder, {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) {
        continue
      }

      const project = resolveProject({
        absoluteFolder,
        entry,
        fallbackTags,
        workspaceFolder,
      })
      if (project !== null) {
        projects.push(project)
      }
    }
  }

  return projects
}

module.exports = { readProjects }
