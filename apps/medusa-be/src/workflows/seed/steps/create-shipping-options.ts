import type {
  IFulfillmentModuleService,
  Logger,
  PriceRule,
  RuleOperatorType,
  WorkflowTypes,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  createShippingOptionsWorkflow,
  updateShippingOptionsWorkflow,
  updateShippingOptionTypesWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  assertSeedResourceNameAvailable,
  buildSeedResourceMetadata,
  type SeedResourceIdentity,
  selectExactOwnedSeedResource,
} from "./seed-resource-identity"

export type CreateShippingOptionsStepInput = {
  name: string
  seedIdentity?: SeedResourceIdentity
  providerId: string
  serviceZoneId: string
  shippingProfileId: string
  regions: Array<
    WorkflowTypes.RegionWorkflow.CreateRegionsWorkflowOutput[0] & {
      amount: number
    }
  >
  type: {
    label: string
    description: string
    code: string
  }
  prices: {
    currencyCode?: string
    amount: number
    rules?: PriceRule[]
  }[]
  rules: {
    attribute: string
    value: string
    operator: RuleOperatorType
  }[]
  data?: Record<string, unknown>
}[]

export type CreateShippingOptionsStepSeedInput = Array<
  Omit<
    CreateShippingOptionsStepInput[0],
    "serviceZoneId" | "shippingProfileId" | "regions"
  > & {
    providerId?: string
  }
>

export type CreateShippingOptionsStepOutput = {
  id: string
}[]

const CreateShippingOptionsStepId = "create-shipping-options-seed-step"

type PersistedShippingOption = Awaited<
  ReturnType<IFulfillmentModuleService["listShippingOptions"]>
>[number]

export function resolveShippingOptionSeedResources(
  existingOptions: PersistedShippingOption[],
  input: CreateShippingOptionsStepInput
): Array<{
  existing?: PersistedShippingOption
  input: CreateShippingOptionsStepInput[number]
}> {
  const ownedHandles = input.flatMap(({ seedIdentity }) =>
    seedIdentity ? [`${seedIdentity.owner}/${seedIdentity.handle}`] : []
  )
  if (new Set(ownedHandles).size !== ownedHandles.length) {
    throw new Error("Shipping-option seed handles must be unique")
  }

  return input.map((inputOption) => {
    let existing: PersistedShippingOption | undefined
    if (inputOption.seedIdentity) {
      existing = selectExactOwnedSeedResource(
        existingOptions.map((option) => ({
          ...option,
          metadata: option.data,
        })),
        inputOption.seedIdentity,
        "Shipping option"
      )
      assertSeedResourceNameAvailable(
        existingOptions,
        inputOption.name,
        existing?.id,
        "Shipping option"
      )
    } else {
      const matching = existingOptions.filter(
        (option) => option.name === inputOption.name
      )
      if (matching.length > 1) {
        throw new Error(`Multiple shipping options named "${inputOption.name}"`)
      }
      existing = matching[0]
    }
    return { existing, input: inputOption }
  })
}

function buildShippingOptionData(
  option: CreateShippingOptionsStepInput[number],
  existing?: PersistedShippingOption
): Record<string, unknown> | undefined {
  if (!option.seedIdentity) {
    return option.data
  }
  return buildSeedResourceMetadata(option.seedIdentity, {
    ...(existing?.data ?? {}),
    ...(option.data ?? {}),
  })
}

export const buildShippingOptionWorkflowPrices = (
  option: Pick<CreateShippingOptionsStepInput[number], "prices" | "regions">
) => [
  ...option.prices.map((price) => ({
    currency_code: price.currencyCode as string,
    amount: price.amount,
    ...(price.rules?.length ? { rules: price.rules } : {}),
  })),
  ...option.regions.map((region) => ({
    region_id: region.id as string,
    amount: region.amount,
  })),
]

export const createShippingOptionsStep = createStep(
  CreateShippingOptionsStepId,
  async (input: CreateShippingOptionsStepInput, { container }) => {
    const result: CreateShippingOptionsStepOutput = []

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const fulfillmentService = container.resolve<IFulfillmentModuleService>(
      Modules.FULFILLMENT
    )

    const hasOwnedOptions = input.some(({ seedIdentity }) => seedIdentity)
    const optionNames = input.map((i) => i.name)
    const existingOptions = await fulfillmentService.listShippingOptions(
      hasOwnedOptions ? {} : { name: { $in: optionNames } },
      {
        relations: ["type"],
        take: hasOwnedOptions ? 10_000 : undefined,
      }
    )
    const resolvedOptions = resolveShippingOptionSeedResources(
      existingOptions,
      input
    )
    const missingOptions = resolvedOptions.flatMap(({ existing, input }) =>
      existing ? [] : [input]
    )
    const updateOptions = resolvedOptions.flatMap(({ existing, input }) =>
      existing ? [{ existing, input }] : []
    )

    if (missingOptions.length > 0) {
      logger.info("Creating missing shipping options...")

      // For new shipping options, always create a new type
      const workflowInput = missingOptions.map((option) => ({
        name: option.name,
        price_type: "flat" as const,
        provider_id: option.providerId,
        service_zone_id: option.serviceZoneId,
        shipping_profile_id: option.shippingProfileId,
        data: buildShippingOptionData(option),
        type: {
          label: option.type.label,
          description: option.type.description,
          code: option.type.code,
        },
        prices: buildShippingOptionWorkflowPrices(option),
        rules: option.rules.map((rule) => ({
          attribute: rule.attribute,
          operator: rule.operator,
          value: rule.value,
        })),
      }))

      const { result: createResult } = await createShippingOptionsWorkflow(
        container
      ).run({
        input: workflowInput,
      })

      for (const resultElement of createResult) {
        result.push({ id: resultElement.id })
      }
    }

    if (updateOptions.length > 0) {
      logger.info("Updating existing shipping options...")

      // For updates, check if the existing shipping option's type code matches the input type code
      // If it matches, use type_id to reference existing type and update it separately
      // If it doesn't match, create a new type
      const updateInputs = updateOptions.map(
        ({ existing, input: inputOption }) => {
          const existingType = existing.type
          const codeMatches = existingType?.code === inputOption.type.code

          const baseInput = {
            id: existing.id,
            name: inputOption.name,
            price_type: "flat" as const,
            provider_id: inputOption.providerId,
            service_zone_id: inputOption.serviceZoneId,
            shipping_profile_id: inputOption.shippingProfileId,
            data: buildShippingOptionData(inputOption, existing),
            prices: buildShippingOptionWorkflowPrices(inputOption),
            rules: inputOption.rules.map((rule) => ({
              attribute: rule.attribute,
              operator: rule.operator,
              value: rule.value,
            })),
          }

          if (codeMatches && existingType) {
            // Use type_id to reference existing type (will update it separately)
            return {
              ...baseInput,
              type_id: existingType.id,
            }
          }

          // Code doesn't match - create new type object
          return {
            ...baseInput,
            type: {
              label: inputOption.type.label,
              description: inputOption.type.description,
              code: inputOption.type.code,
            },
          }
        }
      )

      const { result: updateResult } = await updateShippingOptionsWorkflow(
        container
      ).run({
        input: updateInputs,
      })

      for (const resultElement of updateResult) {
        result.push({ id: resultElement.id })
      }

      // Update existing types where code matched with new values from input
      const typesToUpdate = updateOptions.filter(
        ({ existing, input: inputOption }) =>
          existing.type?.code === inputOption.type.code && existing.type
      )

      if (typesToUpdate.length > 0) {
        for (const { existing, input: inputOption } of typesToUpdate) {
          logger.info(
            `Updating existing shipping option type: ${inputOption.type.code}`
          )
          await updateShippingOptionTypesWorkflow(container).run({
            input: {
              selector: { id: existing.type.id },
              update: {
                label: inputOption.type.label,
                description: inputOption.type.description,
                code: inputOption.type.code,
              },
            },
          })
        }
      }
    }

    return new StepResponse({
      result,
    })
  }
)
