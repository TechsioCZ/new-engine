import { companyCheckCzAddressCountWorkflow } from "../../../../../src/workflows/company-check/workflows/address-count"
import { companyCheckCzInfoWorkflow } from "../../../../../src/workflows/company-check/workflows/company-info"

describe("company-check workflows", () => {
  it("exports executable address-count workflow", () => {
    expect(typeof companyCheckCzAddressCountWorkflow).toBe("function")
    expect(typeof companyCheckCzAddressCountWorkflow.run).toBe("function")
    expect(companyCheckCzAddressCountWorkflow.getName()).toBe(
      "company-check-cz-address-count-workflow"
    )
  })

  it("exports executable company-info workflow", () => {
    expect(typeof companyCheckCzInfoWorkflow).toBe("function")
    expect(typeof companyCheckCzInfoWorkflow.run).toBe("function")
    expect(companyCheckCzInfoWorkflow.getName()).toBe(
      "company-check-cz-info-workflow"
    )
  })
})
