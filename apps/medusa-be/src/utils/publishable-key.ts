import type {
  IApiKeyModuleService,
  ILockingModule,
} from "@medusajs/framework/types"

export const DEFAULT_PUBLISHABLE_KEY_TITLE = "Storefront Publishable Key"

const PUBLISHABLE_KEY_LOCK_TIMEOUT_SECONDS = 5
const PUBLISHABLE_KEY_LOCK_PREFIX = "publishable-key:provision"

type ListedApiKey = Awaited<ReturnType<IApiKeyModuleService["listApiKeys"]>>[number]
type CreatedApiKey = Awaited<ReturnType<IApiKeyModuleService["createApiKeys"]>>

type PublishableApiKey = ListedApiKey | CreatedApiKey

export type PublishableKeyResult = {
  apiKey: PublishableApiKey
  created: boolean
  title: string
}

type PublishableKeyLookupInput = {
  apiKeyService: IApiKeyModuleService
  title?: string | null
}

type ProvisionPublishableKeyInput = PublishableKeyLookupInput & {
  createdBy?: string | null
  lockingModule?: ILockingModule | null
}

export function resolvePublishableKeyTitle(title?: string | null): string {
  return (
    title?.trim() ||
    process.env.INITIAL_PUBLISHABLE_KEY_NAME?.trim() ||
    DEFAULT_PUBLISHABLE_KEY_TITLE
  )
}

async function findActivePublishableKey(
  apiKeyService: IApiKeyModuleService,
  title: string
): Promise<ListedApiKey | null> {
  const existingKeys = await apiKeyService.listApiKeys({
    title,
    type: "publishable",
  })

  return existingKeys.find((key) => !key.revoked_at) ?? null
}

function buildProvisionLockKey(title: string): string {
  return `${PUBLISHABLE_KEY_LOCK_PREFIX}:${encodeURIComponent(title)}`
}

export async function getActivePublishableKey({
  apiKeyService,
  title,
}: PublishableKeyLookupInput): Promise<PublishableKeyResult | null> {
  const resolvedTitle = resolvePublishableKeyTitle(title)
  const apiKey = await findActivePublishableKey(apiKeyService, resolvedTitle)

  if (!apiKey) {
    return null
  }

  return {
    apiKey,
    created: false,
    title: resolvedTitle,
  }
}

export async function provisionPublishableKey({
  apiKeyService,
  title,
  createdBy,
  lockingModule,
}: ProvisionPublishableKeyInput): Promise<PublishableKeyResult> {
  const resolvedTitle = resolvePublishableKeyTitle(title)

  const getOrCreatePublishableKey = async (): Promise<PublishableKeyResult> => {
    const existingApiKey = await findActivePublishableKey(
      apiKeyService,
      resolvedTitle
    )

    if (existingApiKey) {
      return {
        apiKey: existingApiKey,
        created: false,
        title: resolvedTitle,
      }
    }

    const createdApiKey = await apiKeyService.createApiKeys({
      title: resolvedTitle,
      type: "publishable",
      created_by: createdBy?.trim() || "",
    })

    return {
      apiKey: createdApiKey,
      created: true,
      title: resolvedTitle,
    }
  }

  if (!lockingModule) {
    return getOrCreatePublishableKey()
  }

  return lockingModule.execute(
    buildProvisionLockKey(resolvedTitle),
    getOrCreatePublishableKey,
    { timeout: PUBLISHABLE_KEY_LOCK_TIMEOUT_SECONDS }
  )
}
