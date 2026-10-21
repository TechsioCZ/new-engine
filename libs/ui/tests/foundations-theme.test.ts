import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import postcss from "postcss"
import { describe, expect, it } from "vitest"
import {
  isEffectivelyDisabled,
  subscribeEffectiveDisabled,
  subscribeOwnerFormReset,
} from "../src/internal/form-control-lifecycle"
import {
  BrandThemeScript,
  resolveAppearance,
} from "../src/theme/theme-provider"
import { tv } from "../src/utils"

function executeBrand(stored: string | null, unavailable = false) {
  const attrs = new Map([["data-theme", "neo"]])
  const classes = new Set<string>()
  const element = BrandThemeScript({ defaultBrand: "akros" })
  runInNewContext(element.props.dangerouslySetInnerHTML.__html, {
    localStorage: {
      getItem: () => {
        if (unavailable) {
          throw new Error("blocked")
        }
        return stored
      },
    },
    window: { matchMedia: () => ({ matches: true }) },
    document: {
      documentElement: {
        style: {},
        classList: {
          remove: (...names: string[]) => {
            for (const name of names) {
              classes.delete(name)
            }
          },
          add: (name: string) => classes.add(name),
        },
        setAttribute: (name: string, value: string) => attrs.set(name, value),
        removeAttribute: (name: string) => attrs.delete(name),
      },
    },
  })
  return attrs.get("data-theme")
}

describe("pre-hydration brand script", () => {
  it("preserves stored base when the application defaults to Akros", () => {
    expect(executeBrand("base")).toBeUndefined()
  })
  it.each([null, "unknown", "__proto__", "constructor"])(
    "rejects invalid stored brand %s",
    (stored) => {
      expect(executeBrand(stored)).toBe("akros")
    }
  )
  it("applies a registered non-base brand", () => {
    expect(executeBrand("neo")).toBe("neo")
  })
  it("does not throw when storage is unavailable", () => {
    expect(executeBrand(null, true)).toBe("akros")
  })
})

describe("foundation token class merging", () => {
  it("keeps label and popover font weights independent from font family", () => {
    for (const weight of ["label", "popover-title"]) {
      const classes = tv({ base: `font-${weight} font-sans` })().split(" ")
      expect(classes).toContain(`font-${weight}`)
      expect(classes).toContain("font-sans")
    }
  })
  it("does not drop popover description size when adding its foreground", () => {
    const classes = tv({
      base: "text-popover-description text-popover-description-fg",
    })().split(" ")
    expect(classes).toContain("text-popover-description")
    expect(classes).toContain("text-popover-description-fg")
  })
})

describe("requested and effective appearance", () => {
  it.each(["akros", "business"] as const)(
    "constrains %s without changing the request",
    (brand) => {
      expect(resolveAppearance(brand, "dark", "dark")).toBe("light")
      expect(resolveAppearance(brand, "system", "dark")).toBe("light")
      expect(resolveAppearance("base", "dark", "light")).toBe("dark")
      expect(resolveAppearance("neo", "system", "dark")).toBe("dark")
    }
  )
  it("attaches a CSP nonce to the synchronous bootstrap", () => {
    expect(BrandThemeScript({ nonce: "test-nonce" }).props.nonce).toBe(
      "test-nonce"
    )
  })
  it("keeps arbitrary outline style and semantic color in separate merge groups", () => {
    const classes = tv({
      base: [
        "outline-select-border-error",
        "outline-(style:--default-ring-style)",
        "outline-(length:--default-ring-width)",
      ].join(" "),
    })()
    expect(classes).toContain("outline-select-border-error")
    expect(classes).toContain("outline-(style:--default-ring-style)")
    expect(classes).toContain("outline-(length:--default-ring-width)")
  })
})

describe("shared owner-form reset subscription", () => {
  const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0))
  it("runs after native reset and respects cancellation and cleanup", async () => {
    const form = new EventTarget()
    const input = { form, isConnected: true } as unknown as HTMLInputElement
    let resets = 0
    const dispose = subscribeOwnerFormReset(input, () => {
      resets += 1
    })
    form.dispatchEvent(new Event("reset", { cancelable: true }))
    expect(resets).toBe(0)
    await nextTask()
    expect(resets).toBe(1)
    form.addEventListener("reset", (event) => event.preventDefault(), {
      once: true,
    })
    form.dispatchEvent(new Event("reset", { cancelable: true }))
    await nextTask()
    expect(resets).toBe(1)
    form.dispatchEvent(new Event("reset"))
    dispose()
    await nextTask()
    expect(resets).toBe(1)
  })
  it("waits past between-listener microtask checkpoints before checking cancellation", async () => {
    const listeners: ((event: Event) => void)[] = []
    const form = {
      addEventListener: (_type: string, listener: (event: Event) => void) => {
        listeners.push(listener)
      },
      removeEventListener: () => undefined,
    }
    let resets = 0
    const dispose = subscribeOwnerFormReset(
      { form, isConnected: true } as unknown as HTMLInputElement,
      () => {
        resets += 1
      }
    )
    const event = new Event("reset", { cancelable: true })
    // Native browser dispatch can perform this checkpoint before invoking the
    // next listener. A queueMicrotask callback would already reconcile here.
    const dispatchReset = listeners[0]
    if (!dispatchReset) {
      throw new Error("Expected the reset subscription")
    }
    dispatchReset(event)
    await Promise.resolve()
    expect(resets).toBe(0)
    event.preventDefault()
    await nextTask()
    expect(resets).toBe(0)
    dispose()
  })
})

describe("owner form reassociation", () => {
  const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0))
  function fixture() {
    let notify: () => void = () => undefined
    const disconnected = { count: 0 }
    class Observer {
      constructor(callback: () => void) {
        notify = callback
      }
      observe() {
        /* Test mutations are delivered explicitly. */
      }
      disconnect() {
        disconnected.count += 1
      }
    }
    const doc = Object.assign(new EventTarget(), {
      defaultView: { MutationObserver: Observer },
      documentElement: {},
    }) as unknown as Document
    const first = new EventTarget(),
      second = new EventTarget()
    const input = {
      form: first,
      isConnected: true,
      ownerDocument: doc,
    } as unknown as HTMLInputElement
    return { doc, first, second, input, mutate: () => notify(), disconnected }
  }
  it("follows actual ownership after form/id changes, DOM moves and replacement", async () => {
    const f = fixture()
    const reset = () => {
      f.doc.dispatchEvent(new Event("reset"))
      f.input.form?.dispatchEvent(new Event("reset", { cancelable: true }))
    }
    let count = 0
    const dispose = subscribeOwnerFormReset(f.input, () => {
      count += 1
    })
    reset()
    await nextTask()
    expect(count).toBe(1)
    Object.assign(f.input, { form: f.second })
    // Capture-phase checkpoint must rebind even before observer delivery.
    reset()
    await nextTask()
    expect(count).toBe(2)
    f.first.dispatchEvent(new Event("reset"))
    await nextTask()
    expect(count).toBe(2)
    Object.assign(f.input, { form: null })
    f.mutate()
    f.second.dispatchEvent(new Event("reset"))
    await nextTask()
    expect(count).toBe(2)
    Object.assign(f.input, { form: f.first })
    f.mutate()
    f.mutate()
    reset()
    await nextTask()
    expect(count).toBe(3)
    dispose()
    reset()
    await nextTask()
    expect(count).toBe(3)
    expect(f.disconnected.count).toBe(1)
  })
  it("settles nested suppression on accepted/canceled resets and disposal", async () => {
    const f = fixture()
    let depth = 0,
      resets = 0
    const dispose = subscribeOwnerFormReset(
      f.input,
      () => {
        resets += 1
      },
      {
        onResetStart: () => {
          depth = 1
        },
        onResetEnd: () => {
          depth = 0
        },
      }
    )
    f.first.dispatchEvent(new Event("reset"))
    expect(depth).toBe(1)
    await nextTask()
    expect([depth, resets]).toEqual([0, 1])
    f.first.addEventListener("reset", (event) => event.preventDefault(), {
      once: true,
    })
    f.first.dispatchEvent(new Event("reset", { cancelable: true }))
    await nextTask()
    expect([depth, resets]).toEqual([0, 1])
    f.first.dispatchEvent(new Event("reset"))
    dispose()
    await nextTask()
    expect([depth, resets]).toEqual([0, 1])
  })
  it.each(["reassociate", "disconnect"])(
    "ignores an old owner's deferred reset after %s during dispatch",
    async (mutation) => {
      const f = fixture()
      let count = 0
      let settling = false
      const dispose = subscribeOwnerFormReset(
        f.input,
        () => {
          count += 1
        },
        {
          onResetStart: () => {
            settling = true
          },
          onResetEnd: () => {
            settling = false
          },
        }
      )
      f.first.addEventListener(
        "reset",
        () => {
          Object.assign(
            f.input,
            mutation === "reassociate"
              ? { form: f.second }
              : { isConnected: false }
          )
          f.mutate()
        },
        { once: true }
      )
      f.first.dispatchEvent(new Event("reset"))
      expect(settling).toBe(true)
      await nextTask()
      expect(count).toBe(0)
      expect(settling).toBe(false)
      Object.assign(f.input, { isConnected: true, form: f.second })
      f.mutate()
      f.second.dispatchEvent(new Event("reset"))
      await nextTask()
      expect(count).toBe(1)
      dispose()
    }
  )
  it("shares ownership observation and releases the final subscriber", () => {
    const f = fixture()
    const first = subscribeOwnerFormReset(f.input, () => undefined)
    const second = subscribeOwnerFormReset(f.input, () => undefined)
    first()
    expect(f.disconnected.count).toBe(0)
    second()
    expect(f.disconnected.count).toBe(1)
  })
})

describe("effective fieldset disabling", () => {
  function node(
    tagName: string,
    parent: HTMLElement | null = null,
    disabled = false
  ) {
    const result = {
      tagName,
      parentElement: parent,
      children: [] as HTMLElement[],
      matches: () => false,
      hasAttribute: (name: string) => name === "disabled" && disabled,
      contains: (child: HTMLElement | null): boolean =>
        child === (result as unknown as HTMLElement) ||
        Array.from(result.children).some((entry) => entry.contains(child)),
    } as unknown as HTMLElement
    if (parent) {
      ;(parent.children as unknown as HTMLElement[]).push(result)
    }
    return result
  }
  it("walks past enabled inner fieldsets", () => {
    const outer = node("FIELDSET", null, true)
    const inner = node("FIELDSET", outer)
    expect(isEffectivelyDisabled(node("SPAN", inner))).toBe(true)
  })
  it("exempts only the first legend of each disabled ancestor", () => {
    const outer = node("FIELDSET", null, true)
    const first = node("LEGEND", outer)
    const later = node("LEGEND", outer)
    expect(isEffectivelyDisabled(node("SPAN", first))).toBe(false)
    expect(isEffectivelyDisabled(node("SPAN", later))).toBe(true)
    const inner = node("FIELDSET", first, true)
    expect(isEffectivelyDisabled(node("SPAN", inner))).toBe(true)
  })
})

describe("shared disabled observer lifecycle", () => {
  it("shares one document observer and releases it with the last subscriber", () => {
    let notify = () => undefined
    let created = 0
    let disconnected = 0
    class Observer {
      constructor(callback: () => undefined) {
        notify = callback
        created += 1
      }
      observe() {
        /* mutation subscriptions do not touch form state */
      }
      disconnect() {
        disconnected += 1
      }
    }
    const doc = {
      defaultView: { MutationObserver: Observer },
      documentElement: {},
    } as unknown as Document
    const element = { ownerDocument: doc } as HTMLElement
    let first = 0,
      second = 0
    const disposeFirst = subscribeEffectiveDisabled(element, () => {
      first += 1
    })
    const disposeSecond = subscribeEffectiveDisabled(element, () => {
      second += 1
    })
    expect(created).toBe(1)
    notify()
    expect([first, second]).toEqual([1, 1])
    disposeFirst()
    notify()
    expect([first, second]).toEqual([1, 2])
    expect(disconnected).toBe(0)
    disposeSecond()
    expect(disconnected).toBe(1)
  })
})

describe("static Akros pressed feedback", () => {
  function declarations(file: string) {
    const entries = new Map<string, string>()
    const css = postcss.parse(
      readFileSync(new URL(file, import.meta.url), "utf8")
    )
    css.walkDecls((declaration) => {
      const inBrand =
        declaration.parent?.type === "rule" &&
        declaration.parent.selector === '[data-theme="akros"]'
      const inScope =
        declaration.parent?.parent?.type === "atrule" &&
        declaration.parent.parent.name === "scope" &&
        declaration.parent.parent.params ===
          '([data-theme="akros"]) to ([data-theme])'
      if (inBrand || inScope) {
        entries.set(declaration.prop, declaration.value)
      }
    })
    return entries
  }
  it.each([
    "../src/tokens/_foundation-overrides.css",
    "../src/tokens/_scheme-scopes.css",
  ])(
    "keeps both solid and light pressed surfaces distinct from the collapsed palette in %s",
    (file) => {
      const tokens = declarations(file)
      expect(tokens.get("--color-bg-light-primary-active")).toBe(
        "var(--color-bg-primary-active)"
      )
      expect(tokens.get("--color-bg-primary-active")).toContain(
        "calc(l - 0.08)"
      )
    }
  )
})
