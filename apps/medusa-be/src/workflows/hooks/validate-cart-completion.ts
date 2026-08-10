import type { CartDTO, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "@medusajs/framework/zod"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"

import { ModuleCompanySpendingLimitResetFrequency } from "../../types/company/module"
import { checkSpendingLimit } from "../../utils/check-spending-limit"
import { getCartApprovalStatus } from "../../utils/get-cart-approval-status"

const normalizeSpendingLimitResetFrequency = (
  value: unknown,
): ModuleCompanySpendingLimitResetFrequency => {
  switch (value) {
    case ModuleCompanySpendingLimitResetFrequency.DAILY:
    case ModuleCompanySpendingLimitResetFrequency.MONTHLY:
    case ModuleCompanySpendingLimitResetFrequency.NEVER:
    case ModuleCompanySpendingLimitResetFrequency.WEEKLY:
    case ModuleCompanySpendingLimitResetFrequency.YEARLY: {
      return value
    }
    default: {
      return ModuleCompanySpendingLimitResetFrequency.NEVER
    }
  }
}

const approvalSchema = z
  .object({ status: z.string().nullable().optional() })
  .transform(({ status }) => (status === undefined ? {} : { status }))
  .nullable()
const cartGraphResultSchema = z.object({
  data: z.array(
    z.object({
      approvals: z
        .array(approvalSchema)
        .optional()
        .transform((approvals) => approvals ?? []),
      customer_id: z.string().nullable().optional(),
      total: z.number(),
    }),
  ),
})

const resetFrequencySchema = z
  .unknown()
  .optional()
  .transform(normalizeSpendingLimitResetFrequency)
const customerGraphResultSchema = z.object({
  data: z.array(
    z.object({
      employee: z
        .object({
          company: z
            .object({
              spending_limit_reset_frequency: resetFrequencySchema,
            })
            .nullable()
            .optional()
            .transform((company) => company ?? null),
          spending_limit: z.number(),
        })
        .nullable()
        .optional()
        .transform((employee) => employee ?? null),
      orders: z
        .array(
          z
            .object({
              created_at: z.union([z.date(), z.string()]),
              total: z.number(),
            })
            .nullable(),
        )
        .optional()
        .transform((orders) => orders ?? []),
    }),
  ),
})

completeCartWorkflow.hooks.validate(
  async ({ cart }: { cart: Pick<CartDTO, "id"> }, { container }) => {
    const cartId = cart.id
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const cartGraphResult: unknown = await query.graph({
      entity: "cart",
      fields: ["approvals.*", "customer_id", "total"],
      filters: {
        id: cartId,
      },
    })
    const parsedCartGraphResult =
      cartGraphResultSchema.safeParse(cartGraphResult)
    const queryCart = parsedCartGraphResult.success
      ? parsedCartGraphResult.data.data[0]
      : undefined

    if (queryCart === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart "${cartId}" was not found`,
      )
    }

    const { isPendingApproval } = getCartApprovalStatus(queryCart)
    if (isPendingApproval) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Cart is pending approval",
      )
    }

    if (
      typeof queryCart.customer_id === "string" &&
      queryCart.customer_id !== ""
    ) {
      const customerGraphResult: unknown = await query.graph({
        entity: "customer",
        fields: ["employee.spending_limit"],
        filters: {
          id: queryCart.customer_id,
        },
      })
      const parsedCustomerGraphResult =
        customerGraphResultSchema.safeParse(customerGraphResult)
      const customer = parsedCustomerGraphResult.success
        ? parsedCustomerGraphResult.data.data[0]
        : undefined

      if (customer === undefined) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Customer "${queryCart.customer_id}" was not found`,
        )
      }

      if (
        customer.employee !== null &&
        customer.employee.spending_limit !== 0 &&
        checkSpendingLimit(queryCart, customer)
      ) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Cart total exceeds spending limit",
        )
      }
    }

    return new StepResponse(undefined, null)
  },
)
