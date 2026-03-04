var mockUseState: jest.Mock
var mockUseEffect: jest.Mock
var mockRegionList: jest.Mock

jest.mock("react", () => ({
  useState: (...args: unknown[]) => mockUseState(...args),
  useEffect: (...args: unknown[]) => mockUseEffect(...args),
}))

jest.mock("../../lib/client", () => ({
  sdk: {
    admin: {
      region: {
        list: (mockRegionList = jest.fn()),
      },
    },
  },
}))

import { useRegions } from "../regions"

describe("legacy useRegions hook", () => {
  beforeEach(() => {
    mockUseState = jest.fn()
    mockUseEffect = jest.fn((effect) => effect())
    mockRegionList.mockReset()
  })

  it("loads regions and updates loading/data state", async () => {
    const setData = jest.fn()
    const setLoading = jest.fn()
    const setError = jest.fn()

    mockUseState
      .mockImplementationOnce(() => [null, setData])
      .mockImplementationOnce(() => [true, setLoading])
      .mockImplementationOnce(() => [null, setError])

    mockRegionList.mockResolvedValue({ regions: [{ id: "reg_1" }] })

    const result = useRegions()
    await Promise.resolve()
    await Promise.resolve()

    expect(result).toEqual({
      data: null,
      loading: true,
      error: null,
    })
    expect(mockRegionList).toHaveBeenCalledTimes(1)
    expect(setData).toHaveBeenCalledWith([{ id: "reg_1" }])
    expect(setLoading).toHaveBeenCalledWith(false)
    expect(setError).not.toHaveBeenCalled()
  })

  it("captures errors and still clears loading state", async () => {
    const setData = jest.fn()
    const setLoading = jest.fn()
    const setError = jest.fn()

    mockUseState
      .mockImplementationOnce(() => [null, setData])
      .mockImplementationOnce(() => [true, setLoading])
      .mockImplementationOnce(() => [null, setError])

    const error = new Error("boom")
    mockRegionList.mockRejectedValue(error)

    useRegions()
    await Promise.resolve()
    await Promise.resolve()

    expect(setError).toHaveBeenCalledWith(error)
    expect(setLoading).toHaveBeenCalledWith(false)
    expect(setData).not.toHaveBeenCalled()
  })
})
