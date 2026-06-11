import { ContainerRegistrationKeys } from "@medusajs/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { COMPANY_MODULE } from "../../../../../src/modules/company"

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createStep: vi.fn((_name, invoke, compensate) =>
    Object.assign(invoke, { compensate })
  ),
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
}))

type MockCompanyService = {
  listCompanies: ReturnType<typeof vi.fn>
  updateCompanies: ReturnType<typeof vi.fn>
}

type MockContainer = ReturnType<typeof makeContainer>

type MockStep = (
  input: {
    id: string
    update: Record<string, unknown>
  },
  context: { container: MockContainer }
) => Promise<{
  compensateInput?: unknown
  payload: unknown
}>

const makeContainer = (companyService: MockCompanyService) => ({
  resolve: vi.fn((key: string) => {
    if (key === ContainerRegistrationKeys.LOGGER) {
      return { info: vi.fn() }
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
    const { updateCompaniesStep } = await import(
      "../../../../../src/workflows/company/steps/update-companies"
    )
    const companyService = {
      listCompanies: vi.fn().mockResolvedValue([
        {
          id: "comp_route",
          name: "Old name",
        },
      ]),
      updateCompanies: vi.fn().mockResolvedValue({
        id: "comp_route",
        name: "New name",
      }),
    }
    const container = makeContainer(companyService)

    const result = await (updateCompaniesStep as MockStep)(
      {
        id: "comp_route",
        update: {
          id: "comp_payload",
          name: "New name",
        },
      },
      { container }
    )

    expect(companyService.listCompanies).toHaveBeenCalledWith({
      id: "comp_route",
    })
    expect(companyService.updateCompanies).toHaveBeenCalledWith({
      id: "comp_route",
      name: "New name",
    })
    expect(result.compensateInput).toEqual({
      id: "comp_route",
      name: "Old name",
    })
  })
})
