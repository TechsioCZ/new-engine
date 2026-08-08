import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import { CUSTOMER_ACCOUNT_DEACTIVATION_NONCE_METADATA_KEY } from "../../src/utils/customer-account-deactivation"

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

type Graph = (input: unknown) => Promise<{ data: unknown[] }>
interface MockContainer {
  resolve: Mock<(key: string) => unknown>
}
type PrepareStep = (
  input: { customer_id: string; deactivation_nonce: string },
  context: { container: MockContainer },
) => Promise<{ payload: unknown }>

const isPrepareStep = (value: unknown): value is PrepareStep =>
  typeof value === "function"

const createContainer = (graph: Mock<Graph>): MockContainer => ({
  resolve: vi.fn<(key: string) => unknown>((key) => {
    if (key === ContainerRegistrationKeys.QUERY) {
      return { graph }
    }

    throw new Error(`Unexpected dependency: ${key}`)
  }),
})

describe("customer deactivation nonce consumption", () => {
  it("rejects a signed token nonce that is no longer current", async () => {
    const { prepareCustomerAccountDeactivationStep } =
      await import("../../src/workflows/customer/steps/prepare-customer-account-deactivation")
    if (!isPrepareStep(prepareCustomerAccountDeactivationStep)) {
      throw new TypeError("Expected a mocked workflow step")
    }

    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [
        {
          deleted_at: null,
          first_name: "Customer",
          has_account: true,
          id: "cus_1",
          metadata: {
            [CUSTOMER_ACCOUNT_DEACTIVATION_NONCE_METADATA_KEY]: "new-nonce",
          },
        },
      ],
    })

    await expect(
      prepareCustomerAccountDeactivationStep(
        { customer_id: "cus_1", deactivation_nonce: "old-nonce" },
        { container: createContainer(graph) },
      ),
    ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
  })

  it("returns metadata with the matching nonce consumed", async () => {
    const { prepareCustomerAccountDeactivationStep } =
      await import("../../src/workflows/customer/steps/prepare-customer-account-deactivation")
    if (!isPrepareStep(prepareCustomerAccountDeactivationStep)) {
      throw new TypeError("Expected a mocked workflow step")
    }

    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [
        {
          deleted_at: null,
          first_name: "Customer",
          has_account: true,
          id: "cus_1",
          metadata: {
            [CUSTOMER_ACCOUNT_DEACTIVATION_NONCE_METADATA_KEY]: "current-nonce",
            preference: "kept",
          },
        },
      ],
    })
    const result = await prepareCustomerAccountDeactivationStep(
      { customer_id: "cus_1", deactivation_nonce: "current-nonce" },
      { container: createContainer(graph) },
    )

    expect(result.payload).toMatchObject({
      customer_id: "cus_1",
      metadata: { preference: "kept" },
    })
  })
})
