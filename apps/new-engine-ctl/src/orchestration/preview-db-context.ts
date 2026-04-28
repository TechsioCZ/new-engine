import {
  listPrepareServiceIds,
  type StackManifest,
} from "../contracts/stack-manifest.js"
import type { ZaneOperatorClient } from "../zane-operator-client/client.js"

const DEFAULT_PREVIEW_DB_PREFIX = "medusa_pr_"
const DEFAULT_PREVIEW_DB_APP_USER_PREFIX = "medusa_pr_app_"

export type PreviewDbContext = {
  required: boolean
  name: string
  user: string
  password: string
}

export function deployServiceIdsRequirePreviewDb(input: {
  manifest: StackManifest
  deployServiceIds: string[]
}): boolean {
  const previewDbServiceIds = new Set(
    listPrepareServiceIds(input.manifest, "preview_db")
  )

  return input.deployServiceIds.some((serviceId) =>
    previewDbServiceIds.has(serviceId)
  )
}

function assertResolvedPreviewDbMatches(input: {
  providedName: string
  providedUser: string
  providedPassword: string
  resolvedName: string
  resolvedUser: string
  resolvedPassword: string
}): void {
  const mismatches: string[] = []

  if (input.providedName && input.providedName !== input.resolvedName) {
    mismatches.push("name")
  }

  if (input.providedUser && input.providedUser !== input.resolvedUser) {
    mismatches.push("user")
  }

  if (
    input.providedPassword &&
    input.providedPassword !== input.resolvedPassword
  ) {
    mismatches.push("password")
  }

  if (mismatches.length > 0) {
    throw new Error(
      `Resolved preview DB credentials do not match prepared values: ${mismatches.join(", ")}.`
    )
  }
}

export async function resolvePreviewDbContext(input: {
  prNumber: number
  deployServiceIds: string[]
  manifest: StackManifest
  previewDbName: string
  previewDbUser: string
  previewDbPassword: string
  dryRun: boolean
  zaneOperatorClient: ZaneOperatorClient | null
}): Promise<PreviewDbContext> {
  const required = deployServiceIdsRequirePreviewDb({
    manifest: input.manifest,
    deployServiceIds: input.deployServiceIds,
  })

  if (!required) {
    return {
      required: false,
      name: input.previewDbName,
      user: input.previewDbUser,
      password: input.previewDbPassword,
    }
  }

  if (input.previewDbName && input.previewDbUser && input.previewDbPassword) {
    return {
      required: true,
      name: input.previewDbName,
      user: input.previewDbUser,
      password: input.previewDbPassword,
    }
  }

  if (input.dryRun) {
    return {
      required: true,
      name:
        input.previewDbName || `${DEFAULT_PREVIEW_DB_PREFIX}${input.prNumber}`,
      user:
        input.previewDbUser ||
        `${DEFAULT_PREVIEW_DB_APP_USER_PREFIX}${input.prNumber}`,
      password:
        input.previewDbPassword || `dry-run:preview-db:${input.prNumber}`,
    }
  }

  if (!input.zaneOperatorClient) {
    throw new Error(
      "Preview DB credentials are required for this preview deploy, but zane-operator is not configured."
    )
  }

  const resolved = (
    await input.zaneOperatorClient.ensurePreviewDb(input.prNumber)
  ).body

  assertResolvedPreviewDbMatches({
    providedName: input.previewDbName,
    providedUser: input.previewDbUser,
    providedPassword: input.previewDbPassword,
    resolvedName: resolved.db_name,
    resolvedUser: resolved.app_user,
    resolvedPassword: resolved.app_password,
  })

  return {
    required: true,
    name: resolved.db_name,
    user: resolved.app_user,
    password: resolved.app_password,
  }
}
