import type {
  IFulfillmentModuleService,
  Logger,
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

export type CreateShippingOptionsStepInput = {
  name: string
  providerId: string
  serviceZoneId: string
  shippingProfileId: string
  regions: (WorkflowTypes.RegionWorkflow.CreateRegionsWorkflowOutput[0] & {
    amount: number
  })[]
  type: {
    label: string
    description: string
    code: string
  }
  prices: {
    currencyCode?: string
    amount: number
  }[]
  rules: {
    attribute: string
    value: string
    operator: RuleOperatorType
  }[]
  data?: Record<string, unknown>
}[]

export type CreateShippingOptionsStepSeedInput = (Omit<
  CreateShippingOptionsStepInput[0],
  "serviceZoneId" | "shippingProfileId" | "regions"
> & {
  providerId?: string
})[]

export type CreateShippingOptionsStepOutput = {
  id: string
}[]

const CreateShippingOptionsStepId = "create-shipping-options-seed-step"
export const createShippingOptionsStep = createStep(
  CreateShippingOptionsStepId,
  async (input: CreateShippingOptionsStepInput, { container }) => {
    const result: CreateShippingOptionsStepOutput = []

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const fulfillmentService = container.resolve<IFulfillmentModuleService>(
      Modules.FULFILLMENT,
    )

    const optionNames = input.map((i) => i.name)

    // Fetch existing shipping options by name with their type relation
    const existingOptions = await fulfillmentService.listShippingOptions(
      {
        name: { $in: optionNames },
      },
      {
        relations: ["type"],
      },
    )

    const missingOptions = input.filter(
      (i) => !existingOptions.find((j) => j.name === i.name),
    )
    const updateOptions = input.flatMap((inputOption) => {
      const existingOption = existingOptions.find(
        (existing) => existing.name === inputOption.name,
      )
      if (existingOption) {
        return [
          {
            existing: existingOption,
            input: inputOption,
          },
        ]
      }
      return []
    })

    if (missingOptions.length > 0) {
      logger.info("Creating missing shipping options...")

      // For new shipping options, always create a new type
      const workflowInput = missingOptions.map((option) => {
        const createInput = {
          name: option.name,
          price_type: "flat" as const,
          prices: [
            ...option.prices.flatMap((price) =>
              price.currencyCode
                ? [{ currency_code: price.currencyCode, amount: price.amount }]
                : [],
            ),
            ...option.regions.map((region) => ({
              region_id: region.id,
              amount: region.amount,
            })),
          ],
          provider_id: option.providerId,
          rules: option.rules.map((rule) => ({
            attribute: rule.attribute,
            operator: rule.operator,
            value: rule.value,
          })),
          service_zone_id: option.serviceZoneId,
          shipping_profile_id: option.shippingProfileId,
          type: {
            code: option.type.code,
            description: option.type.description,
            label: option.type.label,
          },
        }
        return option.data === undefined
          ? createInput
          : { ...createInput, data: option.data }
      })

      const { result: createResult } = await createShippingOptionsWorkflow(
        container,
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
            prices: [
              ...inputOption.prices.flatMap((price) =>
                price.currencyCode
                  ? [
                      {
                        currency_code: price.currencyCode,
                        amount: price.amount,
                      },
                    ]
                  : [],
              ),
              ...inputOption.regions.map((region) => ({
                region_id: region.id,
                amount: region.amount,
              })),
            ],
            provider_id: inputOption.providerId,
            rules: inputOption.rules.map((rule) => ({
              attribute: rule.attribute,
              operator: rule.operator,
              value: rule.value,
            })),
            service_zone_id: inputOption.serviceZoneId,
            shipping_profile_id: inputOption.shippingProfileId,
            ...(inputOption.data === undefined
              ? {}
              : { data: inputOption.data }),
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
              code: inputOption.type.code,
              description: inputOption.type.description,
              label: inputOption.type.label,
            },
          }
        },
      )

      const { result: updateResult } = await updateShippingOptionsWorkflow(
        container,
      ).run({
        input: updateInputs,
      })

      for (const resultElement of updateResult) {
        result.push({ id: resultElement.id })
      }

      // Update existing types where code matched with new values from input
      const typesToUpdate = updateOptions.filter(
        ({ existing, input: inputOption }) =>
          existing.type?.code === inputOption.type.code && existing.type,
      )

      if (typesToUpdate.length > 0) {
        for (const { existing, input: inputOption } of typesToUpdate) {
          logger.info(
            `Updating existing shipping option type: ${inputOption.type.code}`,
          )
          await updateShippingOptionTypesWorkflow(container).run({
            input: {
              selector: { id: existing.type.id },
              update: {
                code: inputOption.type.code,
                description: inputOption.type.description,
                label: inputOption.type.label,
              },
            },
          })
        }
      }
    }

    return new StepResponse({
      result,
    })
  },
)
