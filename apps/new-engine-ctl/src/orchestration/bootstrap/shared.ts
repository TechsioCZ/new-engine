import { execFile } from "node:child_process"
import type { ExecFileException, ExecFileOptions } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

import type { PreviewSharedEnvVariableInput } from "../../contracts/preview-shared-env.js"
import { repoRoot } from "../../paths.js"

const execFileAsync = promisify(
  (
    file: string,
    args: readonly string[],
    options: ExecFileOptions,
    settle: (error: ExecFileException | null, stdout: string) => void,
  ) => {
    execFile(file, args, options, settle)
  },
)
const loopbackUrlPattern =
  /^(?<scheme>https?:\/\/)?(?<host>localhost|127\.0\.0\.1)(?<port>:\d+)?(?<path>\/.*)?$/u
const trailingSlashPattern = /\/+$/u
const httpSchemePattern = /^https?:\/\//u

export type BootstrapValueSource = PreviewSharedEnvVariableInput["source"]

export const firstNonEmpty = (
  ...values: (string | null | undefined)[]
): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

const readGitValue = async (args: string[]): Promise<string | undefined> => {
  try {
    const stdout = await execFileAsync("git", args, {
      cwd: repoRoot,
    })
    const value = stdout.trim()
    return value || undefined
  } catch {
    return undefined
  }
}

export const deriveRepositoryUrl = async (
  explicitValue?: string,
): Promise<string> => {
  if (explicitValue !== undefined && explicitValue.trim() !== "") {
    return explicitValue.trim()
  }

  const remoteUrl = await readGitValue(["remote", "get-url", "origin"])
  if (remoteUrl === undefined || remoteUrl === "") {
    throw new Error("Unable to determine repository URL from git origin.")
  }

  if (remoteUrl.startsWith("git@github.com:")) {
    return `https://github.com/${remoteUrl.slice("git@github.com:".length)}`
  }

  if (remoteUrl.startsWith("ssh://git@github.com/")) {
    return `https://github.com/${remoteUrl.slice("ssh://git@github.com/".length)}`
  }

  if (remoteUrl.startsWith("https://github.com/")) {
    return remoteUrl
  }

  throw new Error(`Unsupported git remote for bootstrap planning: ${remoteUrl}`)
}

export const deriveBranchName = async (
  explicitValue?: string,
): Promise<string> => {
  if (explicitValue !== undefined && explicitValue.trim() !== "") {
    return explicitValue.trim()
  }

  return (await readGitValue(["branch", "--show-current"])) ?? "master"
}

export const isLoopbackUrl = (value?: string): boolean => {
  if (value === undefined || value === "") {
    return false
  }

  return loopbackUrlPattern.test(value.trim())
}

export const normalizeOriginUrl = (value?: string): string | undefined => {
  if (value === undefined || value.trim() === "") {
    return undefined
  }

  const trimmed = value.trim().replace(trailingSlashPattern, "")
  if (httpSchemePattern.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}

const stripTrailingSlash = (value: string): string =>
  value === "/" ? value : value.replace(trailingSlashPattern, "")

export const preferExplicitOrMergeCsv = (input: {
  explicitValue?: string | undefined
  envValue?: string | undefined
  fallbackValue: string
}): string => {
  if (input.explicitValue !== undefined && input.explicitValue.trim() !== "") {
    return input.explicitValue.trim()
  }

  const envEntries = (input.envValue ?? "")
    .split(",")
    .map((entry) => stripTrailingSlash(entry.trim()))
    .filter((entry) => entry.length > 0)
  const values = [
    ...envEntries,
    stripTrailingSlash(input.fallbackValue.trim()),
  ].filter((value) => value.length > 0)

  return [...new Set(values)].join(",")
}

export const resolveOptionalPath = (pathValue?: string): string | undefined => {
  if (pathValue === undefined || pathValue.trim() === "") {
    return undefined
  }

  return path.resolve(pathValue.trim())
}

export const readJsonFile = async (pathValue: string): Promise<unknown> => {
  const raw = await readFile(path.resolve(pathValue), "utf-8")
  const parsed: unknown = JSON.parse(raw)
  return parsed
}

export const literalSource = (value: string): BootstrapValueSource => ({
  kind: "literal",
  value,
})

export const serviceNetworkAliasSource = (
  serviceSlug: string,
): BootstrapValueSource => ({
  kind: "service_network_alias",
  service_slug: serviceSlug,
})

export const serviceGlobalNetworkAliasSource = (
  serviceSlug: string,
): BootstrapValueSource => ({
  kind: "service_global_network_alias",
  service_slug: serviceSlug,
})

export const servicePublicOriginSource = (
  serviceSlug: string,
): BootstrapValueSource => ({
  kind: "service_public_origin",
  service_slug: serviceSlug,
})

export const serviceInternalOriginSource = (input: {
  serviceSlug: string
  port: number
  trailingSlash?: boolean
}): BootstrapValueSource => ({
  kind: "service_internal_origin",
  port: input.port,
  service_slug: input.serviceSlug,
  trailing_slash: input.trailingSlash,
})

export const serviceInternalBucketUrlSource = (input: {
  serviceSlug: string
  port: number
  bucketSharedEnvKey: string
}): BootstrapValueSource => ({
  bucket_shared_env_key: input.bucketSharedEnvKey,
  kind: "service_internal_bucket_url",
  port: input.port,
  service_slug: input.serviceSlug,
})
