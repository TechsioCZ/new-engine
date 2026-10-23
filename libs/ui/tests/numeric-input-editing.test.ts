import { describe, expect, it, vi } from "vitest"
import {
  createNumericInputEditing,
  syncNumericInputValue,
} from "../src/internal/numeric-input-editing"

function editor(value = "12") {
  const frames = new Map<number, FrameRequestCallback>()
  let nextFrame = 0
  const document = {
    activeElement: null as unknown,
    defaultView: {
      requestAnimationFrame(callback: FrameRequestCallback) {
        nextFrame += 1
        frames.set(nextFrame, callback)
        return nextFrame
      },
      cancelAnimationFrame(id: number) {
        frames.delete(id)
      },
    },
  }
  const element = {
    value,
    isConnected: true,
    ownerDocument: document,
    selectionStart: value.length,
    selectionEnd: value.length,
    selectionDirection: "backward",
    setSelectionRange: vi.fn(),
  }
  return {
    input: element as unknown as HTMLInputElement,
    focus: () => {
      document.activeElement = element
    },
    frame() {
      const entry = frames.entries().next().value
      if (entry) {
        frames.delete(entry[0])
        entry[1](0)
      }
    },
    drain() {
      for (const [id, callback] of frames) {
        frames.delete(id)
        callback(0)
      }
    },
  }
}

describe("NumericInput edit ownership", () => {
  it("honors refusal after accepting and committing the same parent value", () => {
    const editing = createNumericInputEditing()
    const view = editor("2")
    editing.reconcile("2")
    editing.edit("1")
    editing.propose("1")
    editing.reconcile("1")
    editing.commit()
    editing.edit("12")
    editing.propose("12")
    editing.reconcile("1")
    expect(editing.resolve("1")).toBe("1")
    editing.commit()
    editing.schedule(view.input, () =>
      syncNumericInputValue(view.input, editing.resolve("1") ?? "")
    )
    view.drain()
    expect(view.input.value).toBe("1")
    expect(editing.resolve("1")).toBe("1")
  })

  it("keeps numeric-acknowledged decimal drafts exactly as typed", () => {
    const editing = createNumericInputEditing()
    const view = editor("2")
    editing.reconcile("2")
    for (const [draft, parent] of [
      ["1", "1"],
      ["1.", "1"],
      ["1.5", "1.5"],
      ["1.50", "1.5"],
    ] as const) {
      view.input.value = draft
      editing.edit(draft)
      editing.propose(draft)
      editing.reconcile(parent)
      editing.schedule(view.input, () => {
        const resolved = editing.resolve(parent) ?? ""
        if (view.input.value !== resolved) {
          syncNumericInputValue(view.input, resolved)
        }
      })
      view.drain()
      expect(view.input.value).toBe(draft)
      expect(view.input.setSelectionRange).not.toHaveBeenCalled()
    }
  })
  it("uses the component parser for locale-aware numeric acknowledgements", () => {
    const editing = createNumericInputEditing((value) =>
      Number.parseFloat(value.replace(",", "."))
    )
    editing.reconcile("2")
    for (const [draft, parent] of [
      ["1", "1"],
      ["1,", "1"],
      ["1,50", "1,5"],
    ] as const) {
      editing.edit(draft)
      editing.propose(draft)
      editing.reconcile(parent)
      expect(editing.resolve(parent)).toBe(draft)
    }
    editing.edit("12")
    editing.reconcile("1,5")
    expect(editing.resolve("1,5")).toBe("1,5")
  })

  it("compares numeric props before display formatting rounds them", () => {
    const editing = createNumericInputEditing()
    editing.reconcile("2", 1.75)
    editing.edit("1.75")
    editing.reconcile("2", 1.75)
    expect(editing.resolve("2", 1.75)).toBe("1.75")
    editing.edit("2")
    expect(editing.resolve("2", 1.75)).toBe("2")
    editing.commit()
    expect(editing.resolve("2", 1.75)).toBe("2")
  })

  it("updates numeric parent authority even when formatting hides the change", () => {
    const editing = createNumericInputEditing()
    editing.reconcile("2", 1.75)
    editing.edit("1.75")
    editing.reconcile("2", 1.75)
    editing.commit()
    editing.reconcile("2", 2)
    editing.edit("2")
    editing.edit("3")
    expect(editing.resolve("2", 2)).toBe("2")
  })

  it("acknowledges empty and NaN drafts without rewriting their text", () => {
    const editing = createNumericInputEditing()
    editing.reconcile("2")
    for (const draft of ["", "-", "."]) {
      editing.edit(draft)
      editing.reconcile("", Number.NaN)
      expect(editing.resolve("", Number.NaN)).toBe(draft)
    }
  })

  it("does not let a queued older proposal mutate a newer native draft", () => {
    const editing = createNumericInputEditing()
    editing.reconcile("2")
    editing.edit("12")
    editing.reconcile("12")
    editing.commit()
    editing.edit("1.5")
    editing.reconcile("1.5")
    editing.propose("12")
    expect(editing.resolve("1.5")).toBe("1.5")
    expect(editing.resolve("12")).toBe("1.5")
  })

  it("leaves uncontrolled native editing and commit normalization unchanged", () => {
    const editing = createNumericInputEditing()
    const view = editor("2")
    editing.reconcile(undefined)
    for (const draft of ["", "1", "1.", "1.5"]) {
      view.input.value = draft
      editing.edit(draft)
      editing.propose(draft)
      editing.reconcile(undefined)
      expect(editing.nativeOwnsValue).toBe(true)
      expect(editing.resolve(undefined)).toBeUndefined()
      expect(view.input.value).toBe(draft)
    }
    editing.commit()
    editing.propose("1.50")
    editing.schedule(view.input, () =>
      syncNumericInputValue(view.input, "1.50")
    )
    view.drain()
    expect(view.input.value).toBe("1.50")
    expect(editing.nativeOwnsValue).toBe(false)
  })

  it("discards the previous blur frame between clear and the next keystroke", () => {
    const editing = createNumericInputEditing()
    const view = editor()
    editing.edit("12")
    editing.commit()
    editing.schedule(view.input, () => syncNumericInputValue(view.input, "12"))
    view.input.value = ""
    editing.edit("")
    view.frame()
    expect(view.input.value).toBe("")
    for (const character of "1.5") {
      view.input.value += character
      editing.edit(view.input.value)
    }
    expect(view.input.value).toBe("1.5")
  })

  it("invalidates controlled-refusal frames when another native key lands", () => {
    const editing = createNumericInputEditing()
    const view = editor("9")
    editing.reconcile("9")
    editing.edit("1")
    view.input.value = "1"
    editing.schedule(view.input, () => syncNumericInputValue(view.input, "9"))
    editing.edit("1.5")
    view.input.value = "1.5"
    view.drain()
    expect(view.input.value).toBe("1.5")
  })

  it("ignores old native and committed acknowledgements across the next edit", () => {
    const editing = createNumericInputEditing()
    editing.reconcile("2")
    editing.edit("12")
    editing.reconcile("12")
    editing.commit()
    editing.edit("")
    editing.reconcile("")
    editing.edit("1.")
    expect(editing.resolve("12")).toBe("1.")
    expect(editing.reconcile("12")).toBe(false)
    editing.edit("1.5")
    expect(editing.resolve("1.")).toBe("1.5")
    expect(editing.resolve("12")).toBe("1.5")
  })

  it("lets a new external value replace the draft and invalidate queued writes", () => {
    const editing = createNumericInputEditing()
    const view = editor("1.5")
    editing.reconcile("2")
    editing.edit("1.5")
    editing.schedule(view.input, () => syncNumericInputValue(view.input, "1.5"))
    expect(editing.resolve("7")).toBe("7")
    expect(editing.reconcile("7")).toBe(true)
    syncNumericInputValue(view.input, "7")
    view.drain()
    expect(view.input.value).toBe("7")
    expect(editing.nativeOwnsValue).toBe(false)
    expect(editing.resolve("1.5")).toBe("1.5")
  })

  it("accepts an external replacement equal to an earlier draft after blur", () => {
    const editing = createNumericInputEditing()
    editing.reconcile("2")
    editing.edit("12")
    editing.reconcile("12")
    editing.commit()
    editing.edit("1.5")
    editing.reconcile("1.5")
    editing.commit()
    expect(editing.resolve("12")).toBe("12")
    expect(editing.reconcile("12")).toBe(true)
  })

  it("restores the actual parent on blur if it never accepted the newer draft", () => {
    const editing = createNumericInputEditing()
    editing.reconcile("2")
    editing.edit("12")
    editing.reconcile("12")
    editing.commit()
    editing.edit("1.5")
    editing.reconcile("1.5")
    editing.reconcile("12")
    expect(editing.resolve("12")).toBe("1.5")
    editing.commit()
    expect(editing.resolve("12")).toBe("12")
    editing.propose("1.5")
    expect(editing.resolve("12")).toBe("12")
    expect(editing.resolve("7")).toBe("7")
    expect(editing.reconcile("7")).toBe(true)
  })

  it("retains a refusing parent's unchanged authority", () => {
    const editing = createNumericInputEditing()
    const view = editor("7")
    editing.reconcile("9")
    editing.edit("7")
    expect(editing.resolve("9")).toBe("9")
    editing.schedule(view.input, () => syncNumericInputValue(view.input, "9"))
    view.drain()
    expect(view.input.value).toBe("9")
  })

  it("restores refusal authority after the draft catches up to an ignored echo", () => {
    const editing = createNumericInputEditing()
    editing.reconcile("2")
    editing.edit("1")
    editing.propose("1")
    editing.edit("12")
    editing.propose("12")
    editing.reconcile("1")
    expect(editing.resolve("1")).toBe("12")
    editing.edit("1")
    editing.propose("1")
    editing.reconcile("1")
    editing.edit("12")
    editing.propose("12")
    expect(editing.resolve("1")).toBe("1")
    editing.commit()
    expect(editing.resolve("1")).toBe("1")
  })

  it("ignores a delayed accepted native echo after clear without any blur", () => {
    const editing = createNumericInputEditing()
    const view = editor("12")
    editing.reconcile("2")
    editing.edit("12")
    editing.propose("12")
    editing.reconcile("12")
    view.input.value = ""
    editing.edit("")
    editing.propose("")
    editing.reconcile("")
    expect(editing.resolve("12")).toBe("")
    expect(editing.reconcile("12")).toBe(false)
    editing.schedule(view.input, () =>
      syncNumericInputValue(view.input, editing.resolve("12") ?? "")
    )
    view.drain()
    for (const character of "1.5") {
      view.input.value += character
      editing.edit(view.input.value)
      editing.propose(view.input.value)
      editing.reconcile(view.input.value)
    }
    expect(view.input.value).toBe("1.5")
    expect(editing.resolve("1.5")).toBe("1.5")
    editing.commit()
    expect(editing.resolve("1.5")).toBe("1.5")
  })

  it.each(["12", "10"])(
    "ignores a late acknowledged commit, including blur normalization (%s)",
    (committedValue) => {
      const editing = createNumericInputEditing()
      editing.reconcile("2")
      editing.edit("12")
      editing.reconcile("12")
      editing.commit()
      editing.propose(committedValue)
      editing.reconcile(committedValue)
      editing.edit("1.")
      editing.reconcile("1.")
      expect(editing.resolve(committedValue)).toBe("1.")
      expect(editing.reconcile(committedValue)).toBe(false)
      editing.edit("1.5")
      editing.reconcile("1.5")
      editing.commit()
      expect(editing.resolve("1.5")).toBe("1.5")
    }
  )

  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    "restores a refusing parent (accepted blur: %s, refused blur: %s)",
    (acceptedBlur, refusedBlur) => {
      const editing = createNumericInputEditing()
      const view = editor("2")
      editing.reconcile("2")
      editing.edit("1")
      editing.propose("1")
      editing.reconcile("1")
      if (acceptedBlur) {
        editing.commit()
        editing.propose("1")
        editing.reconcile("1")
      }
      editing.edit("12")
      editing.propose("12")
      if (refusedBlur) {
        editing.commit()
      }
      expect(editing.resolve("1")).toBe("1")
      expect(editing.reconcile("1")).toBe(false)
      view.input.value = "12"
      editing.schedule(view.input, () =>
        syncNumericInputValue(view.input, editing.resolve("1") ?? "")
      )
      view.drain()
      expect(view.input.value).toBe("1")
    }
  )

  it("allows blur normalization and records its proposal for subsequent edits", () => {
    const editing = createNumericInputEditing()
    const view = editor("12")
    editing.edit("12")
    expect(editing.nativeOwnsValue).toBe(true)
    editing.commit()
    editing.propose("10")
    editing.schedule(view.input, () => syncNumericInputValue(view.input, "10"))
    view.drain()
    expect(editing.nativeOwnsValue).toBe(false)
    expect(view.input.value).toBe("10")
    editing.edit("1.5")
    expect(editing.resolve("10")).toBe("1.5")
  })

  it("reset releases draft history and pending writes, including unchanged parent values", () => {
    const editing = createNumericInputEditing()
    const view = editor("1.5")
    editing.reconcile("12")
    editing.edit("12")
    editing.edit("1.5")
    editing.reconcile("1.5")
    editing.reconcile("12")
    expect(editing.resolve("12")).toBe("1.5")
    editing.schedule(view.input, () => syncNumericInputValue(view.input, "1.5"))
    editing.reset()
    syncNumericInputValue(view.input, "12")
    view.drain()
    expect(editing.resolve("12")).toBe("12")
    expect(view.input.value).toBe("12")
  })

  it("cancels disposed frames and never writes a detached editor", () => {
    const editing = createNumericInputEditing()
    const view = editor()
    const write = vi.fn()
    const cancel = editing.schedule(view.input, write)
    cancel()
    editing.schedule(view.input, write)
    Object.defineProperty(view.input, "isConnected", { value: false })
    view.drain()
    expect(write).not.toHaveBeenCalled()
  })

  it("updates the React tracker even for identical text and preserves the active caret", () => {
    const view = editor("12")
    const setter = vi.fn()
    Object.defineProperty(view.input, "value", { get: () => "12", set: setter })
    view.focus()
    syncNumericInputValue(view.input, "1")
    expect(setter).toHaveBeenCalledWith("1")
    expect(view.input.setSelectionRange).toHaveBeenCalledWith(1, 1, "backward")
  })
})
