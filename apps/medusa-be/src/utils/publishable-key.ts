import type {
  ApiKeyDTO,
  Context,
  CreateApiKeyDTO,
  IApiKeyModuleService,
  ILockingModule,
} from "@medusajs/framework/types"

const DEFAULT_PUBLISHABLE_KEY_TITLE = "Storefront Publishable Key"

const PUBLISHABLE_KEY_LOCK_TIMEOUT_SECONDS = 5
const PUBLISHABLE_KEY_LOCK_PREFIX = "publishable-key:provision"

type ListedApiKey = Awaited<
  ReturnType<IApiKeyModuleService["listApiKeys"]>
>[number]

export interface PublishableKeyResult {
  apiKey: ListedApiKey
  created: boolean
  title: string
}

interface ApiKeyServiceDependency {
  createApiKeys: (
    data: CreateApiKeyDTO,
    sharedContext?: Context,
  ) => Promise<ApiKeyDTO>
  listApiKeys: IApiKeyModuleService["listApiKeys"]
}
type LockingModuleDependency = Pick<ILockingModule, "execute">

interface PublishableKeyLookupInput {
  apiKeyService: ApiKeyServiceDependency
  title?: string | null
}

type ProvisionPublishableKeyInput = PublishableKeyLookupInput & {
  createdBy?: string | null
  lockingModule?: LockingModuleDependency | null
}

export const resolvePublishableKeyTitle = (title?: string | null): string => {
  const explicitTitle = title?.trim()
  if (explicitTitle !== undefined && explicitTitle !== "") {
    return explicitTitle
  }

  const environmentTitle = process.env["INITIAL_PUBLISHABLE_KEY_NAME"]?.trim()
  return environmentTitle === undefined || environmentTitle === ""
    ? DEFAULT_PUBLISHABLE_KEY_TITLE
    : environmentTitle
}

const findActivePublishableKey = async (
  apiKeyService: ApiKeyServiceDependency,
  title: string,
): Promise<ListedApiKey | null> => {
  const existingKeys = await apiKeyService.listApiKeys({
    title,
    type: "publishable",
  })

  return existingKeys.find((key) => key.revoked_at === null) ?? null
}

const buildProvisionLockKey = (title: string): string =>
  `${PUBLISHABLE_KEY_LOCK_PREFIX}:${encodeURIComponent(title)}`

export const getActivePublishableKey = async ({
  apiKeyService,
  title,
}: PublishableKeyLookupInput): Promise<PublishableKeyResult | null> => {
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

export const provisionPublishableKey = async ({
  apiKeyService,
  title,
  createdBy,
  lockingModule,
}: ProvisionPublishableKeyInput): Promise<PublishableKeyResult> => {
  const resolvedTitle = resolvePublishableKeyTitle(title)

  const getOrCreatePublishableKey = async (): Promise<PublishableKeyResult> => {
    const existingApiKey = await findActivePublishableKey(
      apiKeyService,
      resolvedTitle,
    )

    if (existingApiKey) {
      return {
        apiKey: existingApiKey,
        created: false,
        title: resolvedTitle,
      }
    }

    const createdApiKey = await apiKeyService.createApiKeys({
      created_by: createdBy?.trim() ?? "",
      title: resolvedTitle,
      type: "publishable",
    })

    return {
      apiKey: createdApiKey,
      created: true,
      title: resolvedTitle,
    }
  }

  if (lockingModule === undefined || lockingModule === null) {
    return await getOrCreatePublishableKey()
  }

  return await lockingModule.execute(
    buildProvisionLockKey(resolvedTitle),
    getOrCreatePublishableKey,
    { timeout: PUBLISHABLE_KEY_LOCK_TIMEOUT_SECONDS },
  )
}
