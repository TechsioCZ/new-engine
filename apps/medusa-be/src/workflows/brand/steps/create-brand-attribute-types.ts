import type { Context, InferTypeOf } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import type BrandAttributeType from "../../../modules/brand/models/brand-attribute-type"
import type BrandModuleService from "../../../modules/brand/service"
import type { CreateBrandAttributeTypesWorkflowInput } from "../types"
import { getBrandService, withBrandTransaction } from "./helpers"

type BrandAttributeTypeRecord = InferTypeOf<typeof BrandAttributeType>
type EnsuredBrandAttributeType = {
  action: "created" | "existing" | "restored"
  attribute_type: BrandAttributeTypeRecord
}

async function ensureBrandAttributeType(
  service: BrandModuleService,
  name: string,
  sharedContext: Context
): Promise<{
  created_id?: string
  restored_id?: string
  result: EnsuredBrandAttributeType
}> {
  const matches = await service.listBrandAttributeTypes(
    { name },
    {
      take: 3,
      withDeleted: true,
    },
    sharedContext
  )
  const active = matches.filter((record) => !record.deleted_at)
  const deleted = matches.filter((record) => !!record.deleted_at)

  if (active.length > 1 || (!active.length && deleted.length > 1)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Brand attribute type "${name}" has ambiguous persisted records`
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
      sharedContext
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

  const created = await service.createBrandAttributeTypes(
    { name },
    sharedContext
  )
  const createdAttributeType = Array.isArray(created) ? created[0] : created

  if (!createdAttributeType) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Brand attribute type "${name}" was not returned after creation`
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

export const createBrandAttributeTypesStep = createStep(
  "create-brand-attribute-types",
  async (input: CreateBrandAttributeTypesWorkflowInput, { container }) => {
    const service = getBrandService(container)
    const names = input.attribute_types.map(({ name }) => name.trim())

    if (new Set(names).size !== names.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Brand attribute type names must be unique within a request"
      )
    }

    const { compensation, results } = await withBrandTransaction(
      service,
      async (context) => {
        const createdIds: string[] = []
        const restoredIds: string[] = []
        const ensured: EnsuredBrandAttributeType[] = []

        for (const name of names) {
          const outcome = await ensureBrandAttributeType(service, name, context)
          if (outcome.created_id) {
            createdIds.push(outcome.created_id)
          }
          if (outcome.restored_id) {
            restoredIds.push(outcome.restored_id)
          }
          ensured.push(outcome.result)
        }

        return {
          compensation: {
            created_ids: createdIds,
            restored_ids: restoredIds,
          },
          results: ensured,
        }
      }
    )

    return new StepResponse(results, compensation)
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return
    }

    const service = getBrandService(container)

    await withBrandTransaction(service, async (context) => {
      if (compensation.created_ids.length) {
        await service.deleteBrandAttributeTypes(
          compensation.created_ids,
          context
        )
      }
      if (compensation.restored_ids.length) {
        await service.softDeleteBrandAttributeTypes(
          compensation.restored_ids,
          {},
          context
        )
      }
    })
  }
)
