import { describe, expect, it } from "vitest"
import {
  acknowledgeComboboxQuery,
  queueComboboxQuery,
} from "../src/internal/combobox-query-sync"

function edits(values: string[], inputValue = "") {
  return values.reduce<string[]>(
    (pending, value) => queueComboboxQuery(pending, value, inputValue),
    []
  )
}

describe("Combobox in-order controlled query acknowledgements", () => {
  it("applies a restore to a after ab has been acknowledged", () => {
    const pending = edits(["a", "ab"])
    const remaining = acknowledgeComboboxQuery(pending, "ab")
    expect(remaining).toEqual([])
    expect(acknowledgeComboboxQuery(remaining ?? [], "a")).toBeNull()
  })

  it("preserves the native query through each in-order late acknowledgement", () => {
    let pending = edits(["a", "ab", "abc"])
    for (const [value, remaining] of [
      ["a", ["ab", "abc"]],
      ["ab", ["abc"]],
      ["abc", []],
    ] as const) {
      const next = acknowledgeComboboxQuery(pending, value)
      expect(next).toEqual(remaining)
      expect(next).not.toBeNull()
      pending = next ?? []
    }
  })

  it("retires skipped older edits along with the acknowledged entry", () => {
    const pending = edits(["a", "ab", "abc"])
    const remaining = acknowledgeComboboxQuery(pending, "ab")
    expect(remaining).toEqual(["abc"])
    expect(acknowledgeComboboxQuery(remaining ?? [], "a")).toBeNull()
  })

  it("treats a restore to a still-pending value as an acknowledgement", () => {
    // The parent cannot signal whether this pending 'a' is a restore or an echo.
    const pending = edits(["a", "ab"])
    expect(acknowledgeComboboxQuery(pending, "a")).toEqual(["ab"])
  })

  it("clears the batch when an edit equals the current prop without a render", () => {
    const pending = edits(["a", "abc"], "ab")
    const remaining = queueComboboxQuery(pending, "ab", "ab")
    expect(remaining).toEqual([])
    expect(acknowledgeComboboxQuery(remaining, "a")).toBeNull()
    // The unchanged prop also acknowledges the edit when no batch exists yet.
    expect(queueComboboxQuery([], "ab", "ab")).toEqual([])
  })

  it("acknowledges the newest occurrence when native values repeat", () => {
    const pending = edits(["a", "ab", "a", "ab"])
    expect(acknowledgeComboboxQuery(pending, "a")).toEqual(["ab"])
    const remaining = acknowledgeComboboxQuery(pending, "ab")
    expect(remaining).toEqual([])
    expect(acknowledgeComboboxQuery(remaining ?? [], "a")).toBeNull()
  })

  it("handles clears as native values, including an unchanged empty prop", () => {
    const pending = edits(["a", "", "ab"], "seed")
    expect(acknowledgeComboboxQuery(pending, "")).toEqual(["ab"])
    expect(queueComboboxQuery(["a"], "", "")).toEqual([])
  })

  it("recognizes an unrelated parent value as an external replacement", () => {
    expect(
      acknowledgeComboboxQuery(edits(["a", "ab"]), "External query")
    ).toBeNull()
    expect(acknowledgeComboboxQuery([], "a")).toBeNull()
  })

  it("leaves out-of-order response filtering to the parent after completion", () => {
    const pending = edits(["a", "ab", "abc"])
    const remaining = acknowledgeComboboxQuery(pending, "abc")
    expect(remaining).toEqual([])
    expect(acknowledgeComboboxQuery(remaining ?? [], "ab")).toBeNull()
  })

  it("protects every rapidly typed prefix until the delayed parent catches up", () => {
    const query = "zzzzunknown"
    let pending = edits(
      Array.from(query, (_, index) => query.slice(0, index + 1))
    )
    expect(pending).toHaveLength(query.length)
    pending = acknowledgeComboboxQuery(pending, "z") ?? []
    expect(pending.at(-1)).toBe(query)
    expect(pending).toHaveLength(query.length - 1)
    expect(acknowledgeComboboxQuery(pending, query)).toEqual([])
  })
})
