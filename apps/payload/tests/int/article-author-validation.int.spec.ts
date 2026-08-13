import type { CollectionBeforeValidateHook } from "payload"
import { ValidationError } from "payload"
import { describe, expect, it } from "vitest"
import { Articles } from "@/collections/articles"

const validateAuthor = Articles.hooks
  ?.beforeValidate?.[1] as CollectionBeforeValidateHook
type BeforeValidateArgs = Parameters<CollectionBeforeValidateHook>[0]

const runValidation = (args: Partial<BeforeValidateArgs>) =>
  validateAuthor(args as BeforeValidateArgs)

describe("published article author validation", () => {
  it("allows partial updates when the published article already has an author", () => {
    expect(
      runValidation({
        data: { title: "Updated title" },
        operation: "update",
        originalDoc: {
          id: 1,
          status: "published",
          articleAuthor: 10,
        },
        req: {} as BeforeValidateArgs["req"],
      })
    ).toEqual({ title: "Updated title" })
  })

  it("rejects publishing or clearing the author", () => {
    expect(() =>
      runValidation({
        data: { status: "published", articleAuthor: null },
        operation: "update",
        originalDoc: { id: 1, status: "draft", articleAuthor: 10 },
        req: {} as BeforeValidateArgs["req"],
      })
    ).toThrow(ValidationError)
  })

  it("allows drafts without an author", () => {
    expect(
      runValidation({
        data: { status: "draft" },
        operation: "create",
        req: {} as BeforeValidateArgs["req"],
      })
    ).toEqual({ status: "draft" })
  })
})
