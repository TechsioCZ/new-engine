import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import createApprovalSettings from "../create-approval-settings"

const mockWorkflowRun = jest.fn()

jest.mock("../../workflows/approval/workflows", () => ({
  createApprovalSettingsWorkflow: {
    run: (...args: unknown[]) => mockWorkflowRun(...args),
  },
}))

describe("create-approval-settings script", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const makeContext = (companies: any[]) => {
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    }

    const query = {
      graph: jest.fn().mockResolvedValue({ data: companies }),
    }

    const container = {
      resolve: jest.fn((key: unknown) => {
        if (key === ContainerRegistrationKeys.LOGGER) {
          return logger
        }

        if (key === ContainerRegistrationKeys.QUERY) {
          return query
        }

        return undefined
      }),
    }

    return { container, logger, query }
  }

  it("logs and exits when all companies already have approval settings", async () => {
    const { container, logger, query } = makeContext([
      { id: "cmp_1", approval_settings: { id: "as_1" } },
    ])

    await createApprovalSettings({ container } as any)

    expect(query.graph).toHaveBeenCalledWith({
      entity: "company",
      fields: ["id", "approval_settings.*"],
    })
    expect(logger.info).toHaveBeenCalledWith(
      "Found 0 companies without approval settings"
    )
    expect(logger.error).toHaveBeenCalledWith(
      "No companies without approval settings found"
    )
    expect(mockWorkflowRun).not.toHaveBeenCalled()
  })

  it("runs workflow only for companies without approval settings", async () => {
    mockWorkflowRun.mockResolvedValueOnce({
      result: [{ id: "as_1" }, { id: "as_2" }],
    })

    const missingSettingsCompany = { id: "cmp_1", approval_settings: null }
    const { container, logger } = makeContext([
      missingSettingsCompany,
      { id: "cmp_2", approval_settings: { id: "as_existing" } },
      { id: "cmp_3", approval_settings: undefined },
    ])

    await createApprovalSettings({ container } as any)

    expect(mockWorkflowRun).toHaveBeenCalledWith({
      input: [
        missingSettingsCompany,
        { id: "cmp_3", approval_settings: undefined },
      ],
      container,
    })
    expect(logger.info).toHaveBeenCalledWith(
      "Found 2 companies without approval settings"
    )
    expect(logger.info).toHaveBeenCalledWith(
      "Creating approval settings for 2 companies"
    )
    expect(logger.info).toHaveBeenCalledWith(
      "Approval settings created for 2 companies"
    )
  })
})
