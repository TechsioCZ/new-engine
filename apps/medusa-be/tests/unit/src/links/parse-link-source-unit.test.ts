import { MedusaError } from "@medusajs/framework/utils"
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

const captureError = (operation: () => unknown): unknown => {
  try {
    operation()
  } catch (error) {
    return error
  }
  return undefined
}

const expectInvalidLinkSource = (error: unknown, message: string): void => {
  expect(error).toBeInstanceOf(MedusaError)
  expect(error).toMatchObject({
    code: "INVALID_LINK_SOURCE",
    message,
    type: MedusaError.Types.UNEXPECTED_STATE,
  })
}

describe("Medusa link source parsing", () => {
  it("returns the validated serialized link source", () => {
    const source = { toJSON: () => validSerializedSource }

    expect(parseLinkSource(source, "Product module")).toStrictEqual(
      validSerializedSource,
    )
  })

  it("validates serialized nested sources for field overrides", () => {
    expect(
      parseSerializedLinkSource(validSerializedSource, "Product module"),
    ).toStrictEqual(validSerializedSource)
  })

  it("accepts optional and unrelated fields explicitly set to undefined", () => {
    const serializedSource = { ...validSerializedSource }
    Reflect.set(serializedSource, "alias", undefined)
    Reflect.set(serializedSource, "unrelated", undefined)

    expect(
      parseSerializedLinkSource(serializedSource, "Product module"),
    ).toStrictEqual({
      entity: "Product",
      field: "id",
      filterable: ["id", "handle"],
      isList: false,
      linkable: "product_id",
      primaryKey: "id",
      readOnly: false,
      serviceName: "product",
    })
  })

  it("rejects missing required serialized fields", () => {
    expect.hasAssertions()
    const source = {
      toJSON: () => ({ ...validSerializedSource, primaryKey: "" }),
    }

    expectInvalidLinkSource(
      captureError(() => parseLinkSource(source, "Product module")),
      "Product module: linkable definition is invalid",
    )
  })

  it("rejects linkables without a serializer", () => {
    expect.hasAssertions()
    expectInvalidLinkSource(
      captureError(() => parseLinkSource({}, "Product module")),
      "Product module: linkable definition is invalid",
    )
  })

  it("wraps serializer failures with context", () => {
    expect.hasAssertions()
    const serializationError = new Error("serialization broke")
    const source = {
      toJSON: () => {
        throw serializationError
      },
    }
    const error = captureError(() => parseLinkSource(source, "Product module"))

    expectInvalidLinkSource(
      error,
      "Product module: linkable serialization failed",
    )
    expect(error).toHaveProperty("cause", serializationError)
  })
})
