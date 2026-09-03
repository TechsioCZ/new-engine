import type {
  IApiKeyModuleService,
  ILockingModule,
  Logger,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { provisionPublishableKey } from "../../../utils/publishable-key"

export type CreatePublishableKeyStepInput = {
  salesChannelNames?: string[]
  title: string
}

export type PublishableKeyAssociationMode = "exclusive-market" | "legacy-shared"

export type CreatePublishableKeysStepItem = CreatePublishableKeyStepInput & {
  associationMode?: PublishableKeyAssociationMode
}

export type CreatePublishableKeysStepInput = CreatePublishableKeysStepItem[]

export function validatePublishableKeySeedInput(
  input: readonly CreatePublishableKeysStepItem[]
): CreatePublishableKeysStepInput {
  if (!input.length) {
    throw new Error("Seed publishable keys must not be empty")
  }
  const normalized = input.map(
    ({ associationMode, salesChannelNames, title }) => ({
      ...(associationMode ? { associationMode } : {}),
      salesChannelNames: salesChannelNames?.map((name) => name.trim()),
      title: title.trim(),
    })
  )
  if (
    normalized.some(
      ({ associationMode }) =>
        associationMode !== undefined &&
        associationMode !== "exclusive-market" &&
        associationMode !== "legacy-shared"
    )
  ) {
    throw new Error("Unknown publishable-key association mode")
  }
  const legacyShared = normalized.filter(
    ({ associationMode }) => associationMode === "legacy-shared"
  )
  if (
    legacyShared.length &&
    (legacyShared.length !== 1 || input.length !== 1)
  ) {
    throw new Error(
      "Legacy shared publishable-key mode requires exactly one configured key"
    )
  }
  if (
    legacyShared.length &&
    (!legacyShared[0]?.salesChannelNames?.length ||
      new Set(legacyShared[0].salesChannelNames).size !==
        legacyShared[0].salesChannelNames.length)
  ) {
    throw new Error(
      "Legacy shared publishable-key mode requires unique sales channels"
    )
  }
  if (normalized.some(({ title }) => !title)) {
    throw new Error("Seed publishable key titles must not be empty")
  }
  if (
    new Set(normalized.map(({ title }) => title)).size !== normalized.length
  ) {
    throw new Error("Seed publishable key titles must be unique")
  }
  const desiredChannelNames = normalized.flatMap(
    ({ salesChannelNames }) => salesChannelNames ?? []
  )
  if (
    !legacyShared.length &&
    normalized.some(({ salesChannelNames }) => salesChannelNames?.length !== 1)
  ) {
    throw new Error(
      "Seed market publishable keys must target exactly one sales channel"
    )
  }
  if (new Set(desiredChannelNames).size !== desiredChannelNames.length) {
    throw new Error("Seed publishable keys must not share sales channels")
  }
  return normalized
}

export function resolveUniqueActivePublishableKey<
  Candidate extends { id: string; revoked_at?: Date | string | null },
>(title: string, candidates: Candidate[]): Candidate | null {
  const active = candidates.filter(({ revoked_at }) => !revoked_at)
  if (active.length > 1) {
    throw new Error(
      `Ambiguous active publishable API keys for title "${title}"`
    )
  }
  return active[0] ?? null
}

export type SeedPublishableKeyResult = {
  associationMode: PublishableKeyAssociationMode
  publishableApiKey: { id: string }
  salesChannelNames: string[]
  title: string
}

export function toSeedPublishableKeyIdentity(apiKey: { id: string }): {
  id: string
} {
  return { id: apiKey.id }
}

const createPublishableKeyStepId = "create-publishable-key-seed-step"
export const createPublishableKeyStep = createStep(
  createPublishableKeyStepId,
  async (input: CreatePublishableKeyStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const apiKeyService = container.resolve<IApiKeyModuleService>(
      Modules.API_KEY
    )
    const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)

    const result = await provisionPublishableKey({
      apiKeyService,
      lockingModule,
      title: input.title,
    })

    logger.info(
      result.created
        ? "Created publishable API key for seed workflow"
        : "Using existing publishable API key for seed workflow"
    )

    return new StepResponse({
      publishableApiKey: toSeedPublishableKeyIdentity(result.apiKey),
      result: [toSeedPublishableKeyIdentity(result.apiKey)],
    })
  }
)

const createPublishableKeysStepId = "create-publishable-keys-seed-step"
export const createPublishableKeysStep = createStep(
  createPublishableKeysStepId,
  async (input: CreatePublishableKeysStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const apiKeyService = container.resolve<IApiKeyModuleService>(
      Modules.API_KEY
    )
    const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)
    const configured = validatePublishableKeySeedInput(input)

    for (const { title } of configured) {
      const candidates = await apiKeyService.listApiKeys({
        title,
        type: "publishable",
      })
      resolveUniqueActivePublishableKey(title, candidates)
    }

    const result: SeedPublishableKeyResult[] = []
    for (const { associationMode, salesChannelNames, title } of configured) {
      const provisioned = await provisionPublishableKey({
        apiKeyService,
        lockingModule,
        title,
      })
      const postProvisionCandidates = await apiKeyService.listApiKeys({
        title,
        type: "publishable",
      })
      const unique = resolveUniqueActivePublishableKey(
        title,
        postProvisionCandidates
      )
      if (!unique || unique.id !== provisioned.apiKey.id) {
        throw new Error(
          `Publishable API key identity drift for title "${title}"`
        )
      }
      result.push({
        associationMode: associationMode ?? "exclusive-market",
        publishableApiKey: toSeedPublishableKeyIdentity(provisioned.apiKey),
        salesChannelNames: salesChannelNames ?? [],
        title,
      })
    }

    if (
      new Set(result.map(({ publishableApiKey }) => publishableApiKey.id))
        .size !== result.length
    ) {
      throw new Error("Seed publishable API key identities must be distinct")
    }
    logger.info(`Reconciled ${result.length} publishable API key identities`)

    return new StepResponse({ result })
  }
)
