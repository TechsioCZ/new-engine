import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import type { SyncPriceListsStepInput } from "../../../../../src/workflows/seed/steps/sync-price-lists"

const { createPriceListInputs, overrideModule } = vi.hoisted(() => {
  const capturedInputs: unknown[] = []

  return {
    createPriceListInputs: capturedInputs,
    overrideModule: <Module extends object>(
      original: Module,
      replacements: object,
    ): Module =>
      Object.defineProperties(
        { ...original },
        Object.getOwnPropertyDescriptors(replacements),
      ),
  }
})

type StepImplementation = (...args: unknown[]) => unknown
type CreateStep = (
  name: string,
  invoke: StepImplementation,
  compensate?: StepImplementation,
) => StepImplementation

vi.mock(import("@medusajs/framework/workflows-sdk"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    StepResponse: class StepResponse<TPayload = unknown> {
      payload: TPayload

      constructor(payload: TPayload) {
        this.payload = payload
      }
    },
    createStep: vi.fn<CreateStep>((_name, invoke) => invoke),
  }),
)

vi.mock(import("@medusajs/medusa/core-flows"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    batchPriceListPricesWorkflow: () => ({
      run: () => ({
        result: { created: [], updated: [] },
      }),
    }),
    createCustomerGroupsWorkflow: () => ({
      run: () => ({ result: [] }),
    }),
    createPriceListsWorkflow: () => ({
      run: (input: unknown) => {
        createPriceListInputs.push(input)
        return {
          result: [{ id: `price_list_${createPriceListInputs.length}` }],
        }
      },
    }),
    updateCustomerGroupsWorkflow: () => ({
      run: () => ({ result: [] }),
    }),
    updatePriceListsWorkflow: () => ({
      run: () => ({ result: [] }),
    }),
  }),
)

interface MockContainer {
  resolve: Mock<(key: string) => unknown>
}

type SyncPriceListsStep = (
  input: SyncPriceListsStepInput,
  context: { container: MockContainer },
) => Promise<{ payload: unknown }>

const isSyncPriceListsStep = (value: unknown): value is SyncPriceListsStep =>
  typeof value === "function"

const remoteQuery = () => []

const createContainer = (): MockContainer => {
  const logger = {
    info: () => null,
    warn: () => null,
  }
  const productService = {
    listProducts: () => [],
  }
  const pricingService = {
    listPriceLists: () => [],
  }
  const customerService = {
    listCustomerGroups: () => [],
  }

  return {
    resolve: vi.fn<(key: string) => unknown>((key) => {
      if (key === ContainerRegistrationKeys.LOGGER) {
        return logger
      }
      if (key === ContainerRegistrationKeys.REMOTE_QUERY) {
        return remoteQuery
      }
      if (key === Modules.PRODUCT) {
        return productService
      }
      if (key === Modules.PRICING) {
        return pricingService
      }
      if (key === Modules.CUSTOMER) {
        return customerService
      }

      throw new Error(`Unexpected dependency: ${key}`)
    }),
  }
}

const capturedPriceListWorkflowInputSchema = z.object({
  input: z.object({
    price_lists_data: z.array(
      z.object({
        metadata: z.record(z.string(), z.json()),
        title: z.string(),
      }),
    ),
  }),
})

describe("sync price list metadata", () => {
  beforeEach(() => {
    createPriceListInputs.length = 0
  })

  it("builds JSON metadata with configurable keys and omits absent dates", async () => {
    const { syncPriceListsStep } =
      await import("../../../../../src/workflows/seed/steps/sync-price-lists")
    if (!isSyncPriceListsStep(syncPriceListsStep)) {
      throw new TypeError("Expected a mocked workflow step")
    }

    await syncPriceListsStep(
      {
        config: {
          metadataKeys: {
            endsAt: "campaign_ends_at",
            priceListTitle: "origin_title",
            startsAt: "campaign_starts_at",
          },
          metadataSource: "unit-test-seed",
        },
        priceLists: {
          overrides: [
            {
              customerGroupName: "",
              prices: [],
              title: "Wholesale",
            },
          ],
          sales: [
            {
              prices: [],
              sourceTitle: "Retail",
              title: "Summer sale",
            },
          ],
        },
        productIds: [],
      },
      { container: createContainer() },
    )

    const capturedInputs = z
      .array(capturedPriceListWorkflowInputSchema)
      .parse(createPriceListInputs)

    expect(
      capturedInputs.flatMap(({ input }) =>
        input.price_lists_data.map(({ metadata, title }) => ({
          metadata,
          title,
        })),
      ),
    ).toStrictEqual([
      {
        metadata: {
          origin_title: "Wholesale",
          source: "unit-test-seed",
          source_type: "price_list",
        },
        title: "Wholesale",
      },
      {
        metadata: {
          origin_title: "Retail",
          source: "unit-test-seed",
          source_type: "sale",
        },
        title: "Summer sale",
      },
    ])
  })
})
