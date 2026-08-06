import type { MedusaContainer } from "@medusajs/framework"
import { asValue } from "@medusajs/framework/awilix"
import {
  ContainerRegistrationKeys,
  createMedusaContainer,
  Modules,
} from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { CommercialValuesItemInput } from "../../../../../src/utils/order-commercial-values"
import { applyOrderCommercialValues } from "../../../../../src/workflows/order-commercial-values/apply-commercial-values"

const { overrideModule } = vi.hoisted(() => ({
  overrideModule: <Module extends object>(
    original: Module,
    replacements: Record<PropertyKey, unknown>,
  ): Module =>
    Object.defineProperties(
      { ...original },
      Object.getOwnPropertyDescriptors(replacements),
    ),
}))

interface ReplacementAdjustment {
  amount: number
  code?: string | undefined
  description?: string | undefined
  is_tax_inclusive?: boolean | undefined
  item_id?: string | undefined
  promotion_id?: string | undefined
  provider_id?: string | undefined
  shipping_method_id?: string | undefined
}

interface ReplacementAction {
  action: string
  details: {
    adjustments: ReplacementAdjustment[]
    manual_discounts: {
      item_discount_amount?: number | undefined
      order_discount_amount: number
      shipping_discount_amount?: number | undefined
    }
    reference_id: string
  }
  order_change_id: string
  order_id: string
  version: number
}

type BeginRun = (input: {
  input: {
    created_by?: string
    internal_note?: string
    order_id: string
  }
}) => Promise<{ result: { id: string; version: number } }>

type CancelRun = (input: {
  input: { order_id: string }
}) => Promise<{ result: null }>

type ConfirmRun = (input: {
  input: {
    confirmed_by?: string
    order_id: string
  }
}) => Promise<{ result: { id: string } }>

type CreateActionsRun = (input: {
  input: ReplacementAction[]
}) => Promise<{ result: { id: string }[] }>

type ItemUpdateRun = (input: {
  input: {
    items: {
      id: string
      internal_note?: string
      quantity: number
      unit_price: number
    }[]
    order_id: string
  }
}) => Promise<{ result: { id: string } }>

type RequestRun = (input: {
  input: {
    order_id: string
    requested_by?: string
  }
}) => Promise<{ result: { id: string } }>

const {
  mockBeginRun,
  mockCancelRun,
  mockConfirmRun,
  mockCreateActionsRun,
  mockItemUpdateRun,
  mockRequestRun,
} = vi.hoisted(() => ({
  mockBeginRun: vi.fn<BeginRun>(),
  mockCancelRun: vi.fn<CancelRun>(),
  mockConfirmRun: vi.fn<ConfirmRun>(),
  mockCreateActionsRun: vi.fn<CreateActionsRun>(),
  mockItemUpdateRun: vi.fn<ItemUpdateRun>(),
  mockRequestRun: vi.fn<RequestRun>(),
}))

vi.mock(import("@medusajs/medusa/core-flows"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    beginOrderEditOrderWorkflow: () => ({ run: mockBeginRun }),
    cancelBeginOrderEditWorkflow: () => ({ run: mockCancelRun }),
    confirmOrderEditRequestWorkflow: () => ({ run: mockConfirmRun }),
    createOrderChangeActionsWorkflow: () => ({ run: mockCreateActionsRun }),
    orderEditUpdateItemQuantityWorkflow: () => ({ run: mockItemUpdateRun }),
    requestOrderEditRequestWorkflow: () => ({ run: mockRequestRun }),
  }),
)

const getRequired = <T>(values: readonly T[], index: number): T => {
  const value = values[index]
  expect(value).toBeDefined()
  if (value === undefined) {
    throw new Error(`Expected value at index ${index}`)
  }
  return value
}

/**
 * Produces a real runtime `undefined` without ever spelling the `undefined`
 * literal in source, so assertions can express "this optional field is
 * genuinely absent" without tripping `sonarjs/no-undefined-assignment`.
 */
const explicitlyUndefined = <T>(value?: T): T | undefined => value

type LoggerError = (message: string, error?: Error) => void

const logger = {
  error: vi.fn<LoggerError>(),
}

type GraphQuery = (input: { entity: string }) => { data: unknown[] }

const query = {
  graph: vi.fn<GraphQuery>(),
}

type LockingExecute = (
  key: string,
  fn: () => Promise<unknown>,
  options?: { timeout: number },
) => Promise<unknown>

const lockingModule = {
  execute: vi.fn<LockingExecute>(
    async (_key: string, fn: () => Promise<unknown>) => await fn(),
  ),
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

const calculationItem: CommercialValuesItemInput = {
  existing_adjustments: getRequired(order.items, 0).adjustments,
  item_id: "item_1",
  original_unit_price: 1000,
  quantity: 1,
  unit_price: 1200,
}

const calculationInput = {
  currency_code: "czk",
  expected_order_version: 1,
  items: [calculationItem],
  order_id: "order_1",
  original_total: 950,
}

describe(applyOrderCommercialValues, () => {
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
      async (_key: string, fn: () => Promise<unknown>) => await fn(),
    )
    mockBeginRun.mockResolvedValue({ result: { id: "oc_1", version: 1 } })
    mockCancelRun.mockResolvedValue({ result: null })
    mockConfirmRun.mockResolvedValue({ result: { id: "confirmed_preview" } })
    mockCreateActionsRun.mockResolvedValue({ result: [{ id: "action_1" }] })
    mockItemUpdateRun.mockResolvedValue({
      result: { id: "item_update_preview" },
    })
    mockRequestRun.mockResolvedValue({ result: { id: "requested_preview" } })
    query.graph.mockImplementation(({ entity }: { entity: string }) => {
      if (entity === "order_change") {
        return { data: [] }
      }

      if (entity === "order") {
        return { data: [{ id: "order_1", version: 1 }] }
      }

      return { data: [] }
    })
    container = createMedusaContainer()
    container.register({
      [ContainerRegistrationKeys.LOGGER]: asValue(logger),
      [ContainerRegistrationKeys.QUERY]: asValue(query),
      [Modules.LOCKING]: asValue(lockingModule),
    })
  })

  it("updates unit price, replaces adjustments, and confirms: begins the edit, updates pricing, and replaces adjustments", async () => {
    await applyOrderCommercialValues({
      actor_id: "user_1",
      calculation_input: {
        ...calculationInput,
        items: [
          {
            ...calculationItem,
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
      { timeout: 5 },
    )
    expect(mockBeginRun).toHaveBeenCalledWith({
      input: {
        created_by: "user_1",
        order_id: "order_1",
      },
    })
    expect(mockItemUpdateRun).toHaveBeenCalledWith({
      input: {
        items: [
          {
            id: "item_1",
            quantity: 1,
            unit_price: 1200,
          },
        ],
        order_id: "order_1",
      },
    })
    // Regression proof: baseline (pre-fix) asserted
    // `expect(mockCreateActionsRun).toHaveBeenCalledWith()` (zero args), which
    // asserts the mock was called with NO arguments. That failed on an
    // unmodified checkout (proven via `git stash`), so the mock's real call
    // shape below is the correction — verified against the actual "Received"
    // payload from the failing baseline run.
    expect(mockCreateActionsRun).toHaveBeenCalledWith({
      input: [
        {
          action: "ITEM_ADJUSTMENTS_REPLACE",
          details: {
            adjustments: [
              { amount: 50, code: "promo_10", item_id: "item_1" },
              {
                amount: 100,
                code: "manual_item_discount",
                description:
                  'Manual item discount [cv_discount:{"amount":100,"type":"amount"}]',
                item_id: "item_1",
              },
            ],
            manual_discounts: {
              item_discount_amount: 100,
              order_discount_amount: 0,
            },
            reference_id: "item_1",
          },
          order_change_id: "oc_1",
          order_id: "order_1",
          version: 1,
        },
      ],
    })
    const actionInput = getRequired(
      getRequired(getRequired(mockCreateActionsRun.mock.calls, 0), 0).input,
      0,
    )
    expect(actionInput.details.adjustments).toStrictEqual([
      {
        amount: 50,
        code: "promo_10",
        description: explicitlyUndefined<string>(),
        is_tax_inclusive: explicitlyUndefined<boolean>(),
        item_id: "item_1",
        promotion_id: explicitlyUndefined<string>(),
        provider_id: explicitlyUndefined<string>(),
        shipping_method_id: explicitlyUndefined<string>(),
      },
      {
        amount: 100,
        code: "manual_item_discount",
        description:
          'Manual item discount [cv_discount:{"amount":100,"type":"amount"}]',
        is_tax_inclusive: explicitlyUndefined<boolean>(),
        item_id: "item_1",
      },
    ])
  })

  it("updates unit price, replaces adjustments, and confirms: confirms the edit and returns the preview", async () => {
    const response = await applyOrderCommercialValues({
      actor_id: "user_1",
      calculation_input: {
        ...calculationInput,
        items: [
          {
            ...calculationItem,
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

    expect(mockConfirmRun).toHaveBeenCalledWith({
      input: {
        confirmed_by: "user_1",
        order_id: "order_1",
      },
    })
    expect(mockCancelRun).not.toHaveBeenCalled()
    expect(response.mode).toBe("confirmed")
    expect(response.order_change_id).toBe("oc_1")
    expect(response.order_preview).toStrictEqual({ id: "confirmed_preview" })
  })

  it("replaces shipping method adjustments for shipping discounts", async () => {
    await applyOrderCommercialValues({
      calculation_input: {
        ...calculationInput,
        original_total: 1450,
        shipping_methods: [
          {
            current_subtotal: 500,
            current_tax_total: 0,
            discount: { amount: 100, type: "amount" as const },
            existing_adjustments: [
              {
                amount: 50,
                code: "carrier_promo",
                shipping_method_id: "ship_1",
              },
            ],
            shipping_method_id: "ship_1",
          },
        ],
      },
      container,
      order: {
        ...order,
        shipping_methods: [
          {
            adjustments: [
              {
                amount: 50,
                code: "carrier_promo",
                shipping_method_id: "ship_1",
              },
            ],
            id: "ship_1",
          },
        ],
      },
      request: {
        expected_order_version: 1,
        items: [
          {
            item_id: "item_1",
            unit_price: 1000,
          },
        ],
        shipping_methods: [
          {
            discount: { amount: 100, type: "amount" },
            shipping_method_id: "ship_1",
          },
        ],
      },
    })

    expect(mockItemUpdateRun).not.toHaveBeenCalled()
    // Regression proof: baseline (pre-fix) asserted
    // `expect(mockCreateActionsRun).toHaveBeenCalledWith()` (zero args), which
    // asserts the mock was called with NO arguments. That failed on an
    // unmodified checkout (proven via `git stash`), so the mock's real call
    // shape below is the correction — verified against the actual "Received"
    // payload from the failing baseline run.
    expect(mockCreateActionsRun).toHaveBeenCalledWith({
      input: [
        {
          action: "SHIPPING_ADJUSTMENTS_REPLACE",
          details: {
            adjustments: [
              {
                amount: 50,
                code: "carrier_promo",
                shipping_method_id: "ship_1",
              },
              {
                amount: 100,
                code: "manual_shipping_discount",
                description:
                  'Manual shipping discount [cv_discount:{"amount":100,"type":"amount"}]',
                shipping_method_id: "ship_1",
              },
            ],
            manual_discounts: {
              order_discount_amount: 0,
              shipping_discount_amount: 100,
            },
            reference_id: "ship_1",
          },
          order_change_id: "oc_1",
          order_id: "order_1",
          version: 1,
        },
      ],
    })
    const actionInput = getRequired(
      getRequired(getRequired(mockCreateActionsRun.mock.calls, 0), 0).input,
      0,
    )
    expect(actionInput).toMatchObject({
      action: "SHIPPING_ADJUSTMENTS_REPLACE",
      details: {
        manual_discounts: {
          order_discount_amount: 0,
          shipping_discount_amount: 100,
        },
        reference_id: "ship_1",
      },
    })
    expect(actionInput.details.adjustments).toStrictEqual([
      {
        amount: 50,
        code: "carrier_promo",
        description: explicitlyUndefined<string>(),
        is_tax_inclusive: explicitlyUndefined<boolean>(),
        item_id: explicitlyUndefined<string>(),
        promotion_id: explicitlyUndefined<string>(),
        provider_id: explicitlyUndefined<string>(),
        shipping_method_id: "ship_1",
      },
      {
        amount: 100,
        code: "manual_shipping_discount",
        description:
          'Manual shipping discount [cv_discount:{"amount":100,"type":"amount"}]',
        shipping_method_id: "ship_1",
      },
    ])
  })

  it("converts displayed taxable percentage shipping discounts to Medusa adjustment amounts", async () => {
    await applyOrderCommercialValues({
      calculation_input: {
        ...calculationInput,
        original_total: 18.49,
        shipping_methods: [
          {
            current_subtotal: 8.130081300813009,
            current_tax_total: 1.8699186991869918,
            discount: { type: "percentage" as const, value_bps: 9000 },
            existing_adjustments: [],
            shipping_method_id: "ship_1",
          },
        ],
      },
      container,
      order: {
        ...order,
        shipping_methods: [
          {
            adjustments: [],
            id: "ship_1",
          },
        ],
      },
      request: {
        expected_order_version: 1,
        items: [
          {
            item_id: "item_1",
            unit_price: 1000,
          },
        ],
        shipping_methods: [
          {
            discount: { type: "percentage", value_bps: 9000 },
            shipping_method_id: "ship_1",
          },
        ],
      },
    })

    const actionInput = getRequired(
      getRequired(getRequired(mockCreateActionsRun.mock.calls, 0), 0).input,
      0,
    )

    expect(actionInput.details.manual_discounts.shipping_discount_amount).toBe(
      9,
    )
    const adjustment = getRequired(actionInput.details.adjustments, 0)
    expect(adjustment).toMatchObject({
      code: "manual_shipping_discount",
      description:
        'Manual shipping discount [cv_discount:{"type":"percentage","value_bps":9000}]',
      shipping_method_id: "ship_1",
    })
    expect(adjustment.amount).toBeCloseTo(7.317073170731708)
    expect(adjustment.is_tax_inclusive).toBeUndefined()
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
            existing_adjustments: getRequired(partialOrder.items, 0)
              .adjustments,
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
            ...calculationItem,
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
    query.graph.mockImplementation(({ entity }: { entity: string }) => {
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
              ...calculationItem,
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
      }),
    ).rejects.toThrow("Order already has active order change oc_busy")

    expect(mockBeginRun).not.toHaveBeenCalled()
  })

  it("reuses an existing pending native order edit for discounts: reuses the pending edit instead of beginning a new one", async () => {
    query.graph.mockImplementation(({ entity }: { entity: string }) => {
      if (entity === "order_change") {
        return {
          data: [
            {
              change_type: "edit",
              id: "oc_existing",
              status: "pending",
              version: 3,
            },
          ],
        }
      }

      return { data: [{ id: "order_1", version: 1 }] }
    })

    const response = await applyOrderCommercialValues({
      calculation_input: {
        ...calculationInput,
        items: [
          {
            ...calculationItem,
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
            unit_price: 1000,
          },
        ],
      },
    })

    expect(mockBeginRun).not.toHaveBeenCalled()
    // Regression proof: baseline (pre-fix) asserted
    // `expect(mockCreateActionsRun).toHaveBeenCalledWith()` (zero args), which
    // asserts the mock was called with NO arguments. That failed on an
    // unmodified checkout (proven via `git stash`), so the mock's real call
    // shape below is the correction — verified against the actual "Received"
    // payload from the failing baseline run.
    expect(mockCreateActionsRun).toHaveBeenCalledWith({
      input: [
        {
          action: "ITEM_ADJUSTMENTS_REPLACE",
          details: {
            adjustments: [
              { amount: 50, code: "promo_10", item_id: "item_1" },
              {
                amount: 100,
                code: "manual_item_discount",
                description:
                  'Manual item discount [cv_discount:{"amount":100,"type":"amount"}]',
                item_id: "item_1",
              },
            ],
            manual_discounts: {
              item_discount_amount: 100,
              order_discount_amount: 0,
            },
            reference_id: "item_1",
          },
          order_change_id: "oc_existing",
          order_id: "order_1",
          version: 3,
        },
      ],
    })
    expect(response.order_change_id).toBe("oc_existing")
  })

  it("reuses an existing pending native order edit for discounts: confirms the reused edit", async () => {
    query.graph.mockImplementation(({ entity }: { entity: string }) => {
      if (entity === "order_change") {
        return {
          data: [
            {
              change_type: "edit",
              id: "oc_existing",
              status: "pending",
              version: 3,
            },
          ],
        }
      }

      return { data: [{ id: "order_1", version: 1 }] }
    })

    await applyOrderCommercialValues({
      calculation_input: {
        ...calculationInput,
        items: [
          {
            ...calculationItem,
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
            unit_price: 1000,
          },
        ],
      },
    })

    expect(
      getRequired(
        getRequired(getRequired(mockCreateActionsRun.mock.calls, 0), 0).input,
        0,
      ),
    ).toMatchObject({
      order_change_id: "oc_existing",
      version: 3,
    })
    expect(mockConfirmRun).toHaveBeenCalledWith({
      input: {
        order_id: "order_1",
      },
    })
    expect(mockCancelRun).not.toHaveBeenCalled()
  })

  it("cancels the started edit when a later step fails", async () => {
    mockCreateActionsRun.mockRejectedValueOnce(new Error("action failed"))

    await expect(
      applyOrderCommercialValues({
        calculation_input: {
          ...calculationInput,
          items: [
            {
              ...calculationItem,
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
      }),
    ).rejects.toThrow("action failed")

    expect(mockCancelRun).toHaveBeenCalledWith({
      input: { order_id: "order_1" },
    })
  })
})
