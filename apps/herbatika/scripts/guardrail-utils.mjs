/// <reference types="node" />

import path from "node:path"

/**
 * @typedef {object} GuardrailArgs
 * @property {string} configPath - Resolved guardrail config path.
 * @property {boolean} json - Whether JSON output was requested.
 */

/**
 * Parses guardrail script CLI arguments.
 * @param {readonly string[]} argv - Raw CLI arguments (excluding node/script).
 * @param {string} defaultConfigPath - Fallback config path when none is given.
 * @returns {GuardrailArgs} Parsed guardrail arguments.
 */
export const parseGuardrailArgs = (argv, defaultConfigPath) => {
  /** @type {GuardrailArgs} */
  const args = { configPath: defaultConfigPath, json: false }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--json") {
      args.json = true
    } else if (arg === "--config") {
      const nextValue = argv[index + 1]
      if (nextValue) {
        args.configPath = nextValue
        index += 1
      }
    } else if (arg.startsWith("--config=")) {
      args.configPath = arg.slice("--config=".length)
    }
  }

  return args
}

/**
 * Normalizes a filesystem path to use forward slashes.
 * @param {string} value - Path to normalize.
 * @returns {string} Path using forward slashes.
 */
export const normalizePath = (value) => value.replaceAll(path.sep, "/")

/**
 * Converts a glob pattern into an anchored regular expression.
 * @param {string} globPattern - Glob pattern to convert.
 * @returns {RegExp} Anchored regular expression equivalent to the glob.
 */
export const globToRegExp = (globPattern) => {
  const normalized = normalizePath(globPattern)
  const withMarkers = normalized
    .replaceAll("**", "__DOUBLE_STAR__")
    .replaceAll("*", "__SINGLE_STAR__")
  const escaped = withMarkers
    .replaceAll(/[.+^${}()|[\]\\]/gu, "\\$&")
    .replaceAll("__DOUBLE_STAR__", ".*")
    .replaceAll("__SINGLE_STAR__", "[^/]*")

  return new RegExp(`^${escaped}$`, "u")
}
