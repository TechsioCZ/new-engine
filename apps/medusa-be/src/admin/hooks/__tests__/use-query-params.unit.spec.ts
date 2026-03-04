const mockUseSearchParams = jest.fn()

jest.mock("react-router-dom", () => ({
  useSearchParams: (...args: unknown[]) => mockUseSearchParams(...args),
}))

import { useQueryParams } from "../use-query-params"

describe("useQueryParams", () => {
  it("maps direct query keys to values", () => {
    mockUseSearchParams.mockReturnValueOnce([
      new URLSearchParams("q=acme&page=2"),
    ])

    expect(useQueryParams(["q", "page"])).toEqual({
      q: "acme",
      page: "2",
    })
  })

  it("supports prefixed keys and returns undefined for missing keys", () => {
    mockUseSearchParams.mockReturnValueOnce([
      new URLSearchParams("company_q=foo"),
    ])

    expect(useQueryParams(["q", "status"], "company")).toEqual({
      q: "foo",
      status: undefined,
    })
  })
})
