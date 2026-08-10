import type { Context, InferTypeOf } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import type { BrandAttributeType } from "../../../modules/brand/models/brand"
import type BrandModuleService from "../../../modules/brand/service"
import type { CreateBrandAttributeTypesWorkflowInput } from "../types"
import { getBrandService, withBrandTransaction } from "./helpers"

type BrandAttributeTypeRecord = InferTypeOf<typeof BrandAttributeType>
export interface EnsuredBrandAttributeType {
  action: "created" | "existing" | "restored"
  attribute_type: BrandAttributeTypeRecord
}

interface BrandAttributeTypeOutcome {
  created_id?: string
  restored_id?: string
  result: EnsuredBrandAttributeType
}

const ensureBrandAttributeType = async (
  service: BrandModuleService,
  name: string,
  sharedContext: Context,
): Promise<BrandAttributeTypeOutcome> => {
  const matches = await service.listBrandAttributeTypes(
    { name },
    {
      take: 3,
      withDeleted: true,
    },
    sharedContext,
  )
  const active = matches.filter((record) => !record.deleted_at)
  const deleted = matches.filter((record) => Boolean(record.deleted_at))

  if (active.length > 1 || (active.length === 0 && deleted.length > 1)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Brand attribute type "${name}" has ambiguous persisted records`,
    )
  }

  const [activeAttributeType] = active
  if (activeAttributeType) {
    return {
      result: {
        action: "existing",
        attribute_type: activeAttributeType,
      },
    }
  }

  const [deletedAttributeType] = deleted
  if (deletedAttributeType) {
    await service.restoreBrandAttributeTypes(
      [deletedAttributeType.id],
      {},
      sharedContext,
    )
    return {
      restored_id: deletedAttributeType.id,
      result: {
        action: "restored",
        attribute_type: {
          ...deletedAttributeType,
          deleted_at: null,
        },
      },
    }
  }

  const [createdAttributeType] = await service.createBrandAttributeTypes(
    [{ name }],
    sharedContext,
  )

  if (!createdAttributeType) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Brand attribute type "${name}" was not returned after creation`,
    )
  }

  return {
    created_id: createdAttributeType.id,
    result: {
      action: "created",
      attribute_type: createdAttributeType,
    },
  }
}

const ensureBrandAttributeTypesSequentially = async (
  service: BrandModuleService,
  names: string[],
  sharedContext: Context,
  index = 0,
  outcomes: BrandAttributeTypeOutcome[] = [],
): Promise<BrandAttributeTypeOutcome[]> => {
  const name = names[index]

  if (name === undefined) {
    return outcomes
  }

  outcomes.push(await ensureBrandAttributeType(service, name, sharedContext))
  return await ensureBrandAttributeTypesSequentially(
    service,
    names,
    sharedContext,
    index + 1,
    outcomes,
  )
}

export const createBrandAttributeTypesStep = createStep(
  "create-brand-attribute-types",
  async (input: CreateBrandAttributeTypesWorkflowInput, { container }) => {
    const service = getBrandService(container)
    const names = input.attribute_types.map(({ name }) => name.trim())

    if (new Set(names).size !== names.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Brand attribute type names must be unique within a request",
      )
    }

    const { compensation, results } = await withBrandTransaction(
      service,
      async (context) => {
        const outcomes = await ensureBrandAttributeTypesSequentially(
          service,
          names,
          context,
        )
        const createdIds = outcomes.flatMap(({ created_id: createdId }) =>
          createdId === undefined || createdId.length === 0 ? [] : [createdId],
        )
        const restoredIds = outcomes.flatMap(({ restored_id: restoredId }) =>
          restoredId === undefined || restoredId.length === 0
            ? []
            : [restoredId],
        )

        return {
          compensation: {
            created_ids: createdIds,
            restored_ids: restoredIds,
          },
          results: outcomes.map(({ result }) => result),
        }
      },
    )

    return new StepResponse(results, compensation)
  },
  async (compensation, { container }) => {
    if (compensation === undefined || compensation === null) {
      return
    }

    const service = getBrandService(container)

    await withBrandTransaction(service, async (context) => {
      if (compensation.created_ids.length > 0) {
        await service.deleteBrandAttributeTypes(
          compensation.created_ids,
          context,
        )
      }
      if (compensation.restored_ids.length > 0) {
        await service.softDeleteBrandAttributeTypes(
          compensation.restored_ids,
          {},
          context,
        )
      }
    })
  },
)
