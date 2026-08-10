import { beforeEach, describe, expect, it, vi } from "vitest"

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

type MockWorkflowCallback = (...args: never[]) => unknown

vi.mock(import("@medusajs/framework/utils"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    ContainerRegistrationKeys: {
      QUERY: "query",
    },
    Modules: {
      AUTH: "auth",
    },
  }),
)

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
    createStep: vi.fn<
      (
        name: string,
        invoke: MockWorkflowCallback,
        compensate: MockWorkflowCallback,
      ) => MockWorkflowCallback & { compensate: MockWorkflowCallback }
    >((_name, invoke, compensate) => Object.assign(invoke, { compensate })),
  }),
)

interface AuthService {
  updateProviderIdentities: ReturnType<
    typeof vi.fn<(updates: unknown[]) => Promise<void>>
  >
}

type MockContainer = ReturnType<typeof makeContainer>

type CompanyAuthMetadataCompensation =
  | string[]
  | {
      admin_candidates: {
        customer_id?: string | null
        email?: string | null
      }[]
      company_ids: string[]
      provider_identity_ids: string[]
    }

interface MockStep {
  (
    input: string[],
    context: { container: MockContainer },
  ): Promise<{
    compensateInput?: CompanyAuthMetadataCompensation
    payload: unknown
  }>
  compensate: (
    input: CompanyAuthMetadataCompensation | undefined,
    context: { container: MockContainer },
  ) => Promise<void>
}

const isMockStep = (candidate: unknown): candidate is MockStep =>
  typeof candidate === "function" &&
  "compensate" in candidate &&
  typeof candidate.compensate === "function"

const asMockStep = (candidate: unknown): MockStep => {
  if (!isMockStep(candidate)) {
    throw new TypeError(
      "Expected the mocked workflow step to expose callable invoke and compensate functions",
    )
  }

  return candidate
}

const makeAuthService = (
  overrides: Partial<AuthService> = {},
): AuthService => ({
  updateProviderIdentities: vi
    .fn<(updates: unknown[]) => Promise<void>>()
    .mockImplementation(async () => {}),
  ...overrides,
})

const makeContainer = ({
  authService = makeAuthService(),
  graph,
}: {
  authService?: AuthService
  graph: ReturnType<typeof vi.fn<() => Promise<unknown>>>
}) => ({
  resolve: vi.fn<(key: string) => unknown>((key) => {
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
    const { clearCompanyAdminAuthMetadataStep } =
      await import("../../../../../src/workflows/company/steps/clear-company-admin-auth-metadata")
    const graph = vi
      .fn<() => Promise<unknown>>()
      .mockResolvedValueOnce({
        data: [
          {
            employees: [
              {
                customer: { email: "admin@example.com", id: "cus_1" },
                is_admin: true,
              },
              null,
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

    const result = await asMockStep(clearCompanyAdminAuthMetadataStep)(
      ["comp_1"],
      { container },
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
    expect(result.compensateInput).toStrictEqual(["authpi_1"])
  })

  it("restores company admin auth metadata after company restore", async () => {
    const { restoreCompanyAdminAuthMetadataStep } =
      await import("../../../../../src/workflows/company/steps/restore-company-admin-auth-metadata")
    const graph = vi
      .fn<() => Promise<unknown>>()
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

    const result = await asMockStep(restoreCompanyAdminAuthMetadataStep)(
      ["comp_1"],
      { container },
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
    expect(result.compensateInput).toStrictEqual({
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
    const { restoreCompanyAdminAuthMetadataStep } =
      await import("../../../../../src/workflows/company/steps/restore-company-admin-auth-metadata")
    const graph = vi
      .fn<() => Promise<unknown>>()
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

    await asMockStep(restoreCompanyAdminAuthMetadataStep).compensate(
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
      { container },
    )

    expect(authService.updateProviderIdentities).not.toHaveBeenCalled()
  })
})
