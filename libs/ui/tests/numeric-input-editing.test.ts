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

  it("does not revive an already-ignored parent echo when the newer draft blurs", () => {
    const editing = createNumericInputEditing()
    editing.reconcile("2")
    editing.edit("12")
    editing.reconcile("12")
    editing.commit()
    editing.edit("1.5")
    editing.reconcile("1.5")
    editing.reconcile("12")
    editing.commit()
    expect(editing.resolve("12")).toBe("1.5")
    editing.propose("1.5")
    expect(editing.resolve("12")).toBe("1.5")
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
