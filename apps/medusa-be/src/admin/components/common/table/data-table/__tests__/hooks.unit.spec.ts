var mockUseSearchParams: jest.Mock

jest.mock("react-router-dom", () => ({
  useSearchParams: (...args: unknown[]) => mockUseSearchParams(...args),
}))

import { useSelectedParams } from "../hooks"

describe("useSelectedParams", () => {
  beforeEach(() => {
    mockUseSearchParams = jest.fn()
  })

  it("adds a single-value param and clears prefixed offset", () => {
    const setSearchParams = jest.fn()
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams("status=old&orders_offset=20"),
      setSearchParams,
    ])

    const selected = useSelectedParams({
      param: "status",
      prefix: "orders",
      multiple: false,
    })

    selected.add("new")

    const updater = setSearchParams.mock.calls[0][0]
    const updated = updater(new URLSearchParams("orders_status=old&orders_offset=20"))
    expect(updated.get("orders_status")).toBe("new")
    expect(updated.get("orders_offset")).toBeNull()
  })

  it("adds/removes multiple values and prevents duplicates", () => {
    const setSearchParams = jest.fn()
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams("tag=a,b&offset=40"),
      setSearchParams,
    ])

    const selected = useSelectedParams({
      param: "tag",
      multiple: true,
    })

    selected.add("b")
    let updater = setSearchParams.mock.calls[0][0]
    let updated = updater(new URLSearchParams("tag=a,b&offset=40"))
    expect(updated.get("tag")).toBe("a,b")
    expect(updated.get("offset")).toBeNull()

    selected.add("c")
    updater = setSearchParams.mock.calls[1][0]
    updated = updater(new URLSearchParams("tag=a,b&offset=40"))
    expect(updated.get("tag")).toBe("a,b,c")

    selected.delete("b")
    updater = setSearchParams.mock.calls[2][0]
    updated = updater(new URLSearchParams("tag=a,b,c&offset=40"))
    expect(updated.get("tag")).toBe("a,c")

    selected.delete()
    updater = setSearchParams.mock.calls[3][0]
    updated = updater(new URLSearchParams("tag=a,c&offset=40"))
    expect(updated.get("tag")).toBeNull()
  })

  it("returns current selected values", () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams("status=a,,b"),
      jest.fn(),
    ])

    const selected = useSelectedParams({
      param: "status",
      multiple: true,
    })

    expect(selected.get()).toEqual(["a", "b"])
  })

  it("deletes single-value params when delete receives a value", () => {
    const setSearchParams = jest.fn()
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams("status=active&offset=20"),
      setSearchParams,
    ])

    const selected = useSelectedParams({
      param: "status",
      multiple: false,
    })

    selected.delete("active")

    const updater = setSearchParams.mock.calls[0][0]
    const updated = updater(new URLSearchParams("status=active&offset=20"))

    expect(updated.get("status")).toBeNull()
    expect(updated.get("offset")).toBeNull()
  })

  it("covers default multiple=false and no-op multi-delete branches", () => {
    const setSearchParams = jest.fn()
    mockUseSearchParams.mockReturnValue([new URLSearchParams(""), setSearchParams])

    const multi = useSelectedParams({
      param: "tag",
      multiple: true,
      prefix: "orders",
    })

    multi.add("new")
    let updater = setSearchParams.mock.calls[0][0]
    let updated = updater(new URLSearchParams("orders_offset=10"))
    expect(updated.get("orders_tag")).toBe("new")
    expect(updated.get("orders_offset")).toBeNull()

    multi.delete("missing")
    updater = setSearchParams.mock.calls[1][0]
    updated = updater(new URLSearchParams("orders_tag=new&orders_offset=10"))
    expect(updated.get("orders_tag")).toBe("new")

    multi.delete("new")
    updater = setSearchParams.mock.calls[2][0]
    updated = updater(new URLSearchParams("orders_tag=new&orders_offset=10"))
    expect(updated.get("orders_tag")).toBeNull()

    const singleDefault = useSelectedParams({
      param: "status",
      prefix: "orders",
    })

    singleDefault.add("active")
    updater = setSearchParams.mock.calls[3][0]
    updated = updater(new URLSearchParams("orders_offset=10"))
    expect(updated.get("orders_status")).toBe("active")

    mockUseSearchParams.mockReturnValue([new URLSearchParams(""), jest.fn()])
    const empty = useSelectedParams({ param: "status" })
    expect(empty.get()).toEqual([])
  })
})
