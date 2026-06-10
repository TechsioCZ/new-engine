import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    QUERY: "query",
  },
  Modules: {
    AUTH: "auth",
  },
}))

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

type AuthService = {
  updateProviderIdentities: ReturnType<typeof vi.fn>
}

type MockContainer = ReturnType<typeof makeContainer>

type CompanyAuthMetadataCompensation =
  | string[]
  | {
      admin_candidates: Array<{
        customer_id?: string | null
        email?: string | null
      }>
      company_ids: string[]
      provider_identity_ids: string[]
    }

type MockStep = {
  (
    input: string[],
    context: { container: MockContainer }
  ): Promise<{
    compensateInput?: CompanyAuthMetadataCompensation
    payload: unknown
  }>
  compensate: (
    input: CompanyAuthMetadataCompensation | undefined,
    context: { container: MockContainer }
  ) => Promise<void>
}

const makeAuthService = (
  overrides: Partial<AuthService> = {}
): AuthService => ({
  updateProviderIdentities: vi.fn(),
  ...overrides,
})

const makeContainer = ({
  authService = makeAuthService(),
  graph,
}: {
  authService?: AuthService
  graph: ReturnType<typeof vi.fn>
}) => ({
  resolve: vi.fn((key: string) => {
    if (key === "query") {
      return { graph }
    }

    if (key === "auth") {
      return authService
    }

    throw new Error(`Unexpected dependency: ${key}`)
  }),
})

describe("company admin auth metadata steps", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("clears company admin auth metadata before company deletion", async () => {
    const { clearCompanyAdminAuthMetadataStep } = await import(
      "../../../../../src/workflows/company/steps/clear-company-admin-auth-metadata"
    )
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            employees: [
              {
                customer: { email: "admin@example.com", id: "cus_1" },
                is_admin: true,
              },
              {
                customer: { email: "employee@example.com" },
                is_admin: false,
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [{ customer_id: "cus_1", employee_id: "emp_1" }],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company: { deleted_at: null, id: "comp_1" },
            customer: { id: "cus_1" },
            deleted_at: null,
            id: "emp_1",
            is_admin: true,
          },
        ],
      })
      .mockResolvedValueOnce({ data: [{ id: "authpi_1" }] })
    const authService = makeAuthService()
    const container = makeContainer({ authService, graph })

    const result = await (clearCompanyAdminAuthMetadataStep as MockStep)(
      ["comp_1"],
      { container }
    )

    expect(graph).toHaveBeenNthCalledWith(1, {
      entity: "company",
      fields: [
        "id",
        "employees.is_admin",
        "employees.customer.email",
        "employees.customer.id",
      ],
      filters: { id: ["comp_1"] },
    })
    expect(graph).toHaveBeenNthCalledWith(4, {
      entity: "provider_identity",
      fields: ["id"],
      filters: {
        entity_id: ["admin@example.com"],
        provider: "emailpass",
      },
    })
    expect(authService.updateProviderIdentities).toHaveBeenCalledWith([
      {
        id: "authpi_1",
        user_metadata: {
          role: null,
        },
      },
    ])
    expect(result.compensateInput).toEqual(["authpi_1"])
  })

  it("restores company admin auth metadata after company restore", async () => {
    const { restoreCompanyAdminAuthMetadataStep } = await import(
      "../../../../../src/workflows/company/steps/restore-company-admin-auth-metadata"
    )
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            employees: [
              {
                customer: { email: "admin@example.com", id: "cus_1" },
                deleted_at: null,
                is_admin: true,
              },
              {
                customer: { email: "deleted-admin@example.com", id: "cus_2" },
                deleted_at: new Date(),
                is_admin: true,
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({ data: [{ id: "authpi_1" }] })
    const authService = makeAuthService()
    const container = makeContainer({ authService, graph })

    const result = await (restoreCompanyAdminAuthMetadataStep as MockStep)(
      ["comp_1"],
      { container }
    )

    expect(graph).toHaveBeenNthCalledWith(1, {
      entity: "company",
      fields: [
        "id",
        "employees.deleted_at",
        "employees.is_admin",
        "employees.customer.email",
        "employees.customer.id",
      ],
      filters: { id: ["comp_1"] },
    })
    expect(graph).toHaveBeenNthCalledWith(2, {
      entity: "provider_identity",
      fields: ["id"],
      filters: {
        entity_id: ["admin@example.com"],
        provider: "emailpass",
      },
    })
    expect(authService.updateProviderIdentities).toHaveBeenCalledWith([
      {
        id: "authpi_1",
        user_metadata: {
          role: "company_admin",
        },
      },
    ])
    expect(result.compensateInput).toEqual({
      admin_candidates: [
        {
          customer_id: "cus_1",
          email: "admin@example.com",
        },
      ],
      company_ids: ["comp_1"],
      provider_identity_ids: ["authpi_1"],
    })
  })

  it("does not clear restored admin metadata on compensation when another active admin role remains", async () => {
    const { restoreCompanyAdminAuthMetadataStep } = await import(
      "../../../../../src/workflows/company/steps/restore-company-admin-auth-metadata"
    )
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          { customer_id: "cus_1", employee_id: "emp_restored" },
          { customer_id: "cus_1", employee_id: "emp_other" },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company: { deleted_at: null, id: "comp_1" },
            customer: { id: "cus_1" },
            deleted_at: null,
            id: "emp_restored",
            is_admin: true,
          },
          {
            company: { deleted_at: null, id: "comp_2" },
            customer: { id: "cus_1" },
            deleted_at: null,
            id: "emp_other",
            is_admin: true,
          },
        ],
      })
    const authService = makeAuthService()
    const container = makeContainer({ authService, graph })

    await (restoreCompanyAdminAuthMetadataStep as MockStep).compensate(
      {
        admin_candidates: [
          {
            customer_id: "cus_1",
            email: "admin@example.com",
          },
        ],
        company_ids: ["comp_1"],
        provider_identity_ids: ["authpi_1"],
      },
      { container }
    )

    expect(authService.updateProviderIdentities).not.toHaveBeenCalled()
  })
})
