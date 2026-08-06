import { describe, expect, it } from "vitest"

import {
  parseLinkSource,
  parseSerializedLinkSource,
} from "../../../../src/links/parse-link-source"

const validSerializedSource = {
  alias: "product",
  entity: "Product",
  field: "id",
  filterable: ["id", "handle"],
  isList: false,
  linkable: "product_id",
  primaryKey: "id",
  readOnly: false,
  serviceName: "product",
}

describe("Medusa link source parsing", () => {
  it("returns the original valid linkable object", () => {
    const source = { toJSON: () => validSerializedSource }

    expect(parseLinkSource(source, "Product module")).toBe(source)
  })

  it("validates serialized nested sources for field overrides", () => {
    expect(
      parseSerializedLinkSource(validSerializedSource, "Product module"),
    ).toBe(validSerializedSource)
  })

  it("rejects missing required serialized fields", () => {
    const source = {
      toJSON: () => ({ ...validSerializedSource, primaryKey: "" }),
    }

    expect(() => parseLinkSource(source, "Product module")).toThrow(
      "Product module linkable definition is invalid",
    )
  })

  it("rejects linkables without a serializer", () => {
    expect(() => parseLinkSource({}, "Product module")).toThrow(
      "Product module linkable definition is invalid",
    )
  })

  it("wraps serializer failures with context", () => {
    const source = {
      toJSON: () => {
        throw new Error("serialization broke")
      },
    }

    expect(() => parseLinkSource(source, "Product module")).toThrow(
      "Product module linkable serialization failed",
    )
  })
})
