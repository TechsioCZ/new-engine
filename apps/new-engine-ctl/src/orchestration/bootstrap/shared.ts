import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { promisify } from "node:util"

import type { PreviewSharedEnvVariableInput } from "../../contracts/preview-shared-env.js"
import { repoRoot } from "../../paths.js"

const execFileAsync = promisify(execFile)

export type BootstrapValueSource = PreviewSharedEnvVariableInput["source"]

export function firstNonEmpty(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return
}

export async function deriveRepositoryUrl(
  explicitValue?: string
): Promise<string> {
  if (explicitValue?.trim()) {
    return explicitValue.trim()
  }

  const remoteUrl = await readGitValue(["remote", "get-url", "origin"])
  if (!remoteUrl) {
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

export async function deriveBranchName(
  explicitValue?: string
): Promise<string> {
  if (explicitValue?.trim()) {
    return explicitValue.trim()
  }

  return (await readGitValue(["branch", "--show-current"])) || "master"
}

async function readGitValue(args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: repoRoot,
    })
    const value = stdout.trim()
    return value || undefined
  } catch {
    return
  }
}

export function isLoopbackUrl(value?: string): boolean {
  if (!value) {
    return false
  }

  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/.test(
    value.trim()
  )
}

export function normalizeOriginUrl(value?: string): string | undefined {
  if (!value?.trim()) {
    return
  }

  const trimmed = value.trim().replace(/\/+$/, "")
  if (/^https?:\/\//.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}

export function preferPublicCsvOrUrl(input: {
  explicitValue?: string
  envValue?: string
  fallbackValue: string
}): string {
  if (input.explicitValue?.trim()) {
    return input.explicitValue.trim()
  }

  const envEntries = (input.envValue ?? "")
    .split(",")
    .map((entry) => stripTrailingSlash(entry.trim()))
    .filter((entry) => entry.length > 0 && !isLoopbackUrl(entry))
  const values = [
    ...envEntries,
    stripTrailingSlash(input.fallbackValue.trim()),
  ].filter((value) => value.length > 0)

  return Array.from(new Set(values)).join(",")
}

function stripTrailingSlash(value: string): string {
  return value === "/" ? value : value.replace(/\/+$/, "")
}

export function resolveOptionalPath(pathValue?: string): string | undefined {
  if (!pathValue?.trim()) {
    return
  }

  return resolve(pathValue.trim())
}

export async function readJsonFile<T>(pathValue: string): Promise<T> {
  const raw = await readFile(resolve(pathValue), "utf8")
  return JSON.parse(raw) as T
}

export function literalSource(value: string): BootstrapValueSource {
  return {
    kind: "literal",
    value,
  }
}

export function serviceNetworkAliasSource(
  serviceSlug: string
): BootstrapValueSource {
  return {
    kind: "service_network_alias",
    service_slug: serviceSlug,
  }
}

export function serviceGlobalNetworkAliasSource(
  serviceSlug: string
): BootstrapValueSource {
  return {
    kind: "service_global_network_alias",
    service_slug: serviceSlug,
  }
}

export function servicePublicOriginSource(
  serviceSlug: string
): BootstrapValueSource {
  return {
    kind: "service_public_origin",
    service_slug: serviceSlug,
  }
}

export function serviceInternalOriginSource(input: {
  serviceSlug: string
  port: number
  trailingSlash?: boolean
}): BootstrapValueSource {
  return {
    kind: "service_internal_origin",
    service_slug: input.serviceSlug,
    port: input.port,
    trailing_slash: input.trailingSlash,
  }
}

export function serviceInternalBucketUrlSource(input: {
  serviceSlug: string
  port: number
  bucketSharedEnvKey: string
}): BootstrapValueSource {
  return {
    kind: "service_internal_bucket_url",
    service_slug: input.serviceSlug,
    port: input.port,
    bucket_shared_env_key: input.bucketSharedEnvKey,
  }
}
