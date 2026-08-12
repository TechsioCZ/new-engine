import { beforeEach, describe, expect, it, vi } from "vitest"
import { SEARCH_PROFILE_MODULE } from "../../../../../src/modules/search-profile"

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createStep: vi.fn((_name, invoke, compensate) =>
    Object.assign(invoke, { compensate })
  ),
  createWorkflow: vi.fn((_name, composer) => composer),
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
  WorkflowResponse: class WorkflowResponse {
    readonly result: unknown

    constructor(result: unknown) {
      this.result = result
    }
  },
}))

const profileInput = {
  key: "herbatica-sk",
  shop: "herbatica",
  domain: "herbatica.sk",
  locale: "sk",
  sales_channel_ids: ["sc_sk"],
  strict: false,
  separate_variant_results: false,
  minimum_ranking_score: null,
  availability: "all" as const,
  autocomplete_product_limit: 6,
  autocomplete_category_limit: 3,
  autocomplete_brand_limit: 3,
  autocomplete_content_limit: 3,
  full_search_limit: 500,
  max_results_per_page: 100,
  popular_limit: 12,
}

const persistedProfile = {
  ...profileInput,
  id: "search_profile_1",
  last_sync_status: "never" as const,
  last_sync_mode: null,
  last_sync_started_at: null,
  last_synced_at: null,
  last_sync_error: null,
  last_indexed_count: 0,
  last_deleted_count: 0,
  created_at: new Date("2026-08-11T00:00:00.000Z"),
  updated_at: new Date("2026-08-11T00:00:00.000Z"),
  deleted_at: null,
}

const createService = () => ({
  createSearchProfiles: vi.fn().mockResolvedValue(persistedProfile),
  deleteSearchProfiles: vi.fn().mockResolvedValue(undefined),
  invalidateRuntimeProfileCache: vi.fn().mockResolvedValue(undefined),
  restoreSearchProfiles: vi.fn().mockResolvedValue(undefined),
  retrieveSearchProfile: vi.fn().mockResolvedValue(persistedProfile),
  updateSearchProfiles: vi.fn().mockResolvedValue(persistedProfile),
})

const createContainer = (service: ReturnType<typeof createService>) => ({
  resolve: vi.fn((key: string) => {
    if (key === SEARCH_PROFILE_MODULE) {
      return service
    }

    throw new Error(`Unexpected dependency: ${key}`)
  }),
})

type MockStep = ((
  input: unknown,
  context: { container: ReturnType<typeof createContainer> }
) => Promise<{ compensateInput?: unknown; payload: unknown }>) & {
  compensate: (
    input: unknown,
    context: { container: ReturnType<typeof createContainer> }
  ) => Promise<void>
}

describe("search profile mutation steps", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("compensates profile creation without coupling it to cache invalidation", async () => {
    const { createSearchProfileStep } = await import(
      "../../../../../src/workflows/search-profile/mutate-search-profile"
    )
    const service = createService()
    const container = createContainer(service)
    const step = createSearchProfileStep as unknown as MockStep
    const result = await step(profileInput, { container })

    expect(result.compensateInput).toBe(persistedProfile.id)
    expect(service.invalidateRuntimeProfileCache).not.toHaveBeenCalled()

    await step.compensate(result.compensateInput, { container })

    expect(service.deleteSearchProfiles).toHaveBeenCalledWith(
      persistedProfile.id
    )
  })

  it("restores the previous profile when a later workflow step fails", async () => {
    const { updateSearchProfileStep } = await import(
      "../../../../../src/workflows/search-profile/mutate-search-profile"
    )
    const service = createService()
    const container = createContainer(service)
    const step = updateSearchProfileStep as unknown as MockStep
    const result = await step(
      { id: persistedProfile.id, profile: { ...profileInput, strict: true } },
      { container }
    )

    expect(result.compensateInput).toEqual({
      id: persistedProfile.id,
      profile: profileInput,
    })
    expect(service.invalidateRuntimeProfileCache).not.toHaveBeenCalled()

    await step.compensate(result.compensateInput, { container })

    expect(service.updateSearchProfiles).toHaveBeenLastCalledWith({
      id: persistedProfile.id,
      ...profileInput,
    })
  })

  it("restores a deleted profile when cache invalidation fails", async () => {
    const { deleteSearchProfileStep } = await import(
      "../../../../../src/workflows/search-profile/mutate-search-profile"
    )
    const service = createService()
    const container = createContainer(service)
    const step = deleteSearchProfileStep as unknown as MockStep
    const result = await step({ id: persistedProfile.id }, { container })

    expect(service.retrieveSearchProfile).toHaveBeenCalledWith(
      persistedProfile.id
    )
    expect(result.compensateInput).toBe(persistedProfile.id)
    expect(service.invalidateRuntimeProfileCache).not.toHaveBeenCalled()

    await step.compensate(result.compensateInput, { container })

    expect(service.restoreSearchProfiles).toHaveBeenCalledWith(
      persistedProfile.id
    )
  })

  it("invalidates the runtime cache in a dedicated step", async () => {
    const { invalidateSearchProfileRuntimeCacheStep } = await import(
      "../../../../../src/workflows/search-profile/mutate-search-profile"
    )
    const service = createService()
    const container = createContainer(service)
    const step = invalidateSearchProfileRuntimeCacheStep as unknown as MockStep
    const result = await step(persistedProfile.id, { container })

    expect(service.invalidateRuntimeProfileCache).toHaveBeenCalledOnce()
    expect(result.payload).toEqual({
      invalidated: true,
      profile_id: persistedProfile.id,
    })
  })
})
