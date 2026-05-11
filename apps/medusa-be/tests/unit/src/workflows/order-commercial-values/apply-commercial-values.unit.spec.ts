import type { MedusaContainer } from "@medusajs/framework"
import { asValue, createContainer } from "@medusajs/framework/awilix"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  mockBeginRun,
  mockCancelRun,
  mockConfirmRun,
  mockCreateActionsRun,
  mockItemUpdateRun,
  mockRequestRun,
} = vi.hoisted(() => ({
  mockBeginRun: vi.fn(),
  mockCancelRun: vi.fn(),
  mockConfirmRun: vi.fn(),
  mockCreateActionsRun: vi.fn(),
  mockItemUpdateRun: vi.fn(),
  mockRequestRun: vi.fn(),
}))

vi.mock("@medusajs/medusa/core-flows", () => ({
  beginOrderEditOrderWorkflow: () => ({ run: mockBeginRun }),
  cancelBeginOrderEditWorkflow: () => ({ run: mockCancelRun }),
  confirmOrderEditRequestWorkflow: () => ({ run: mockConfirmRun }),
  createOrderChangeActionsWorkflow: () => ({ run: mockCreateActionsRun }),
  orderEditUpdateItemQuantityWorkflow: () => ({ run: mockItemUpdateRun }),
  requestOrderEditRequestWorkflow: () => ({ run: mockRequestRun }),
}))

import { applyOrderCommercialValues } from "../../../../../src/workflows/order-commercial-values/apply-commercial-values"

const logger = {
  error: vi.fn(),
}

const query = {
  graph: vi.fn(),
}

const lockingModule = {
  execute: vi.fn((_key: string, fn: () => Promise<unknown>) => fn()),
}

let container: MedusaContainer

const order = {
  id: "order_1",
  items: [
    {
      adjustments: [{ amount: 50, code: "promo_10", item_id: "item_1" }],
      id: "item_1",
      quantity: 1,
      unit_price: 1000,
    },
  ],
}

const calculationInput = {
  currency_code: "czk",
  expected_order_version: 1,
  items: [
    {
      existing_adjustments: order.items[0].adjustments,
      item_id: "item_1",
      original_unit_price: 1000,
      quantity: 1,
      unit_price: 1200,
    },
  ],
  order_id: "order_1",
  original_total: 950,
}

describe("applyOrderCommercialValues", () => {
  beforeEach(() => {
    mockBeginRun.mockReset()
    mockCancelRun.mockReset()
    mockConfirmRun.mockReset()
    mockCreateActionsRun.mockReset()
    mockItemUpdateRun.mockReset()
    mockRequestRun.mockReset()
    logger.error.mockReset()
    query.graph.mockReset()
    lockingModule.execute.mockReset()
    lockingModule.execute.mockImplementation(
      (_key: string, fn: () => Promise<unknown>) => fn()
    )
    mockBeginRun.mockResolvedValue({ result: { id: "oc_1", version: 1 } })
    mockCancelRun.mockResolvedValue({ result: null })
    mockConfirmRun.mockResolvedValue({ result: { id: "confirmed_preview" } })
    mockCreateActionsRun.mockResolvedValue({ result: [{ id: "action_1" }] })
    mockItemUpdateRun.mockResolvedValue({
      result: { id: "item_update_preview" },
    })
    mockRequestRun.mockResolvedValue({ result: { id: "requested_preview" } })
    query.graph.mockImplementation(async ({ entity }: { entity: string }) => {
      if (entity === "order_change") {
        return { data: [] }
      }

      if (entity === "order") {
        return { data: [{ id: "order_1", version: 1 }] }
      }

      return { data: [] }
    })
    container = createContainer().register({
      [ContainerRegistrationKeys.LOGGER]: asValue(logger),
      [ContainerRegistrationKeys.QUERY]: asValue(query),
      [Modules.LOCKING]: asValue(lockingModule),
    }) as unknown as MedusaContainer
  })

  it("updates unit price, replaces adjustments, and confirms", async () => {
    const response = await applyOrderCommercialValues({
      actor_id: "user_1",
      calculation_input: {
        ...calculationInput,
        items: [
          {
            ...calculationInput.items[0],
            discount: { amount: 100, type: "amount" as const },
          },
        ],
      },
      container,
      order,
      request: {
        expected_order_version: 1,
        items: [
          {
            discount: { amount: 100, type: "amount" },
            item_id: "item_1",
            unit_price: 1200,
          },
        ],
      },
    })

    expect(lockingModule.execute).toHaveBeenCalledWith(
      "order-commercial-values:apply:order_1",
      expect.any(Function),
      { timeout: 5 }
    )
    expect(mockBeginRun).toHaveBeenCalledWith({
      input: {
        created_by: "user_1",
        internal_note: undefined,
        order_id: "order_1",
      },
    })
    expect(mockItemUpdateRun).toHaveBeenCalledWith({
      input: {
        items: [
          {
            id: "item_1",
            internal_note: undefined,
            quantity: 1,
            unit_price: 1200,
          },
        ],
        order_id: "order_1",
      },
    })
    expect(mockCreateActionsRun).toHaveBeenCalled()
    const actionInput = mockCreateActionsRun.mock.calls[0][0].input[0]
    expect(actionInput.details.adjustments).toEqual([
      {
        amount: 50,
        code: "promo_10",
        description: undefined,
        is_tax_inclusive: undefined,
        item_id: "item_1",
        promotion_id: undefined,
        provider_id: undefined,
      },
      {
        amount: 100,
        code: "manual_item_discount",
        description: "Manual item discount",
        item_id: "item_1",
      },
    ])
    expect(mockConfirmRun).toHaveBeenCalledWith({
      input: {
        confirmed_by: "user_1",
        order_id: "order_1",
      },
    })
    expect(mockCancelRun).not.toHaveBeenCalled()
    expect(response.mode).toBe("confirmed")
    expect(response.order_change_id).toBe("oc_1")
    expect(response.order_preview).toEqual({ id: "confirmed_preview" })
  })

  it("does not replace adjustments for omitted items", async () => {
    const partialOrder = {
      id: "order_1",
      items: [
        {
          adjustments: [
            { amount: 100, code: "manual_item_discount", item_id: "item_1" },
          ],
          id: "item_1",
          quantity: 1,
          unit_price: 1000,
        },
        {
          adjustments: [],
          id: "item_2",
          quantity: 1.5,
          unit_price: 500,
        },
      ],
    }

    await applyOrderCommercialValues({
      calculation_input: {
        ...calculationInput,
        items: [
          {
            existing_adjustments: partialOrder.items[0].adjustments,
            item_id: "item_1",
            original_unit_price: 1000,
            quantity: 1,
            unit_price: 1000,
          },
          {
            existing_adjustments: [],
            item_id: "item_2",
            original_unit_price: 500,
            quantity: 1.5,
            unit_price: 600,
          },
        ],
        original_total: 1400,
      },
      container,
      order: partialOrder,
      request: {
        expected_order_version: 1,
        items: [
          {
            item_id: "item_2",
            unit_price: 600,
          },
        ],
      },
    })

    expect(mockItemUpdateRun).toHaveBeenCalledWith({
      input: {
        items: [
          {
            id: "item_2",
            internal_note: undefined,
            quantity: 1.5,
            unit_price: 600,
          },
        ],
        order_id: "order_1",
      },
    })
    expect(mockCreateActionsRun).not.toHaveBeenCalled()
  })

  it("does not replace adjustments for null discounts without existing manual discounts", async () => {
    await applyOrderCommercialValues({
      calculation_input: {
        ...calculationInput,
        items: [
          {
            ...calculationInput.items[0],
            unit_price: 1000,
          },
        ],
      },
      container,
      order,
      request: {
        expected_order_version: 1,
        items: [
          {
            discount: null,
            item_id: "item_1",
            unit_price: 1000,
          },
        ],
        order_discount: null,
      },
    })

    expect(mockItemUpdateRun).not.toHaveBeenCalled()
    expect(mockCreateActionsRun).not.toHaveBeenCalled()
  })

  it("checks active order changes inside the commercial values lock", async () => {
    query.graph.mockImplementation(async ({ entity }: { entity: string }) => {
      if (entity === "order_change") {
        return { data: [{ id: "oc_busy", version: 1 }] }
      }

      return { data: [{ id: "order_1", version: 1 }] }
    })

    await expect(
      applyOrderCommercialValues({
        calculation_input: {
          ...calculationInput,
          items: [
            {
              ...calculationInput.items[0],
              discount: { amount: 100, type: "amount" as const },
            },
          ],
        },
        container,
        order,
        request: {
          expected_order_version: 1,
          items: [
            {
              discount: { amount: 100, type: "amount" },
              item_id: "item_1",
              unit_price: 1200,
            },
          ],
        },
      })
    ).rejects.toThrow("Order already has active order change oc_busy")

    expect(mockBeginRun).not.toHaveBeenCalled()
  })

  it("cancels the started edit when a later step fails", async () => {
    mockCreateActionsRun.mockRejectedValueOnce(new Error("action failed"))

    await expect(
      applyOrderCommercialValues({
        calculation_input: {
          ...calculationInput,
          items: [
            {
              ...calculationInput.items[0],
              discount: { amount: 100, type: "amount" as const },
            },
          ],
        },
        container,
        order,
        request: {
          expected_order_version: 1,
          items: [
            {
              discount: { amount: 100, type: "amount" },
              item_id: "item_1",
              unit_price: 1200,
            },
          ],
        },
      })
    ).rejects.toThrow("action failed")

    expect(mockCancelRun).toHaveBeenCalledWith({
      input: { order_id: "order_1" },
    })
  })
})
