import { ContainerRegistrationKeys } from "@medusajs/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import { COMPANY_MODULE } from "../../../../../src/modules/company"

const { overrideModule } = vi.hoisted(() => ({
  overrideModule: <Module extends object>(
    original: Module,
    replacements: object,
  ): Module =>
    Object.defineProperties(
      { ...original },
      Object.getOwnPropertyDescriptors(replacements),
    ),
}))

type StepInvoke = (input: unknown, context: unknown) => Promise<unknown>
type StepCompensate = (input: unknown, context: unknown) => Promise<void>
type CreateStep = (
  name: string,
  invoke: StepInvoke,
  compensate: StepCompensate,
) => StepInvoke & { compensate: StepCompensate }
type ServiceMethod = (input: unknown) => Promise<unknown>

vi.mock(import("@medusajs/framework/workflows-sdk"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    StepResponse: class StepResponse<
      TPayload = unknown,
      TCompensationInput = unknown,
    > {
      compensateInput: TCompensationInput | undefined
      payload: TPayload

      constructor(payload: TPayload, compensateInput?: TCompensationInput) {
        this.payload = payload
        this.compensateInput = compensateInput
      }
    },
    createStep: vi.fn<CreateStep>((_name, invoke, compensate) =>
      Object.assign(invoke, { compensate }),
    ),
  }),
)

interface MockCompanyService {
  listCompanies: Mock<ServiceMethod>
  updateCompanies: Mock<ServiceMethod>
}

type MockContainer = ReturnType<typeof makeContainer>

type MockStep = (
  input: {
    id: string
    update: { id?: string; name?: string }
  },
  context: { container: MockContainer },
) => Promise<{
  compensateInput?: unknown
  payload: unknown
}>

const isMockStep = (candidate: unknown): candidate is MockStep =>
  typeof candidate === "function"

const asMockStep = (candidate: unknown): MockStep => {
  if (!isMockStep(candidate)) {
    throw new TypeError(
      "Expected the imported workflow step to be a mocked function",
    )
  }
  return candidate
}

const makeContainer = (companyService: MockCompanyService) => ({
  resolve: vi.fn<(key: string) => unknown>((key) => {
    if (key === ContainerRegistrationKeys.LOGGER) {
      return { info: vi.fn<() => void>() }
    }

    if (key === COMPANY_MODULE) {
      return companyService
    }

    throw new Error(`Unexpected dependency: ${key}`)
  }),
})

describe("updateCompaniesStep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("uses the workflow input id instead of an id inside the update payload", async () => {
    const { updateCompaniesStep } =
      await import("../../../../../src/workflows/company/steps/update-companies")
    const companyService = {
      listCompanies: vi.fn<ServiceMethod>().mockResolvedValue([
        {
          id: "comp_route",
          name: "Old name",
        },
      ]),
      updateCompanies: vi.fn<ServiceMethod>().mockResolvedValue({
        id: "comp_route",
        name: "New name",
      }),
    }
    const container = makeContainer(companyService)

    const result = await asMockStep(updateCompaniesStep)(
      {
        id: "comp_route",
        update: {
          id: "comp_payload",
          name: "New name",
        },
      },
      { container },
    )

    expect(companyService.listCompanies).toHaveBeenCalledWith({
      id: "comp_route",
    })
    expect(companyService.updateCompanies).toHaveBeenCalledWith({
      id: "comp_route",
      name: "New name",
    })
    expect(result.compensateInput).toStrictEqual({
      id: "comp_route",
      name: "Old name",
    })
  })
})
