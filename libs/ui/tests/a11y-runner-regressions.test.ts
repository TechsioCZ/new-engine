import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { runInNewContext } from "node:vm"
import ts from "typescript"
import { describe, expect, it, vi } from "vitest"

function functionSource(source: string, name: string) {
  const file = ts.createSourceFile(
    "fixture.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const declaration = file.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === name
  )
  if (!declaration) {
    throw new Error(`Missing ${name}`)
  }
  return ts.transpile(declaration.getText(file), {
    target: ts.ScriptTarget.ESNext,
  })
}

const require = createRequire(import.meta.url)
const addonSource = readFileSync(
  join(dirname(require.resolve("@techsio/storybook-better-a11y")), "699.js"),
  "utf8"
)
const selectorSource = functionSource(addonSource, "getSelector")

describe("patched accessibility addon selectors", () => {
  it.each(["ts-chart", "focus:ring"])(
    "serializes SVGAnimatedString classes (%s)",
    (className) => {
      const parent = { children: [] as unknown[] }
      const body = { children: [parent] }
      const svg = {
        id: "",
        tagName: "svg",
        // The native SVG property is not a string, even without a class attribute.
        className: { baseVal: className },
        classList: { item: () => className },
        parentElement: body,
      }
      const path = {
        id: "",
        tagName: "path",
        className: { baseVal: "" },
        classList: { item: () => null },
        parentElement: parent,
      }
      Object.assign(parent, svg)
      parent.children.push(path)
      const escapeIdentifier = vi.fn((value: string) =>
        value.replaceAll(":", "\\:")
      )
      const selector = runInNewContext(
        `${selectorSource}; getSelector(element)`,
        {
          apcaChecker_document: { body },
          CSS: { escape: escapeIdentifier },
          element: path,
        }
      ) as string
      expect(selector).toBe(
        `svg.${className.replaceAll(":", "\\:")}:nth-child(1) > path:nth-child(1)`
      )
      expect(escapeIdentifier).toHaveBeenCalledWith(className)
    }
  )

  it("escapes generated ids rather than emitting invalid CSS", () => {
    const escapeIdentifier = vi.fn(() => "escaped-id")
    const selector = runInNewContext(
      `${selectorSource}; getSelector(element)`,
      {
        CSS: { escape: escapeIdentifier },
        element: { id: "chart:_r_0_:mark" },
      }
    ) as string
    expect(selector).toBe("#escaped-id")
    expect(escapeIdentifier).toHaveBeenCalledWith("chart:_r_0_:mark")
  })
})

const stepsSource = functionSource(
  readFileSync(new URL("../src/molecules/steps.tsx", import.meta.url), "utf8"),
  "useNavigationFocus"
)

function navigationHarness() {
  const layout: (() => void)[] = []
  const passive: (() => void)[] = []
  const frames: (() => void)[] = []
  const microtasks: (() => void)[] = []
  const pending = { current: null }
  const focus = vi.fn()
  const body = {}
  const document = { body, activeElement: body as object }
  const source = {
    ownerDocument: document,
    closest: () => ({ querySelector: () => ({ focus }) }),
  }
  document.activeElement = source
  const hook = runInNewContext(`${stepsSource}; useNavigationFocus`, {
    useRef: () => pending,
    useState: () => [0, vi.fn()],
    queueMicrotask: (callback: () => void) => microtasks.push(callback),
    useLayoutEffect: (effect: () => void) => layout.push(effect),
    useEffect: (effect: () => void) => passive.push(effect),
    requestAnimationFrame: (callback: () => void) => frames.push(callback),
    flushSync: (navigate: () => void) => {
      navigate()
      flush(layout)
    },
  }) as (api: {
    value: number
  }) => (button: typeof source, navigate: () => void) => void
  const flush = (callbacks: (() => void)[]) => {
    for (const callback of callbacks.splice(0)) {
      callback()
    }
  }
  // A busy browser may paint before flushing passive effects. Layout effects
  // must still run during the commit, before that animation frame.
  const paint = () => {
    flush(layout)
    flush(frames)
    flush(passive)
  }
  return {
    source,
    document,
    focus,
    render: (value: number) => hook({ value }),
    propose: (value: number) => microtasks.push(() => hook({ value })),
    settle: () => flush(microtasks),
    paint,
  }
}

describe("Steps navigation focus across browser paint", () => {
  it("commits accepted navigation and focuses before yielding to a frame", () => {
    const h = navigationHarness()
    const request = h.render(0)
    h.paint()
    expect(h.focus).not.toHaveBeenCalled()
    request(h.source, () => {
      h.propose(1)
    })
    h.settle()
    expect(h.focus).toHaveBeenCalledOnce()
    h.paint()
    expect(h.focus).toHaveBeenCalledOnce()
  })

  it("does not retain rejected proposals for a later external update", () => {
    const h = navigationHarness()
    const request = h.render(0)
    h.paint()
    request(h.source, () => {
      h.propose(0)
    })
    h.settle()
    h.paint()
    h.render(1)
    h.paint()
    expect(h.focus).not.toHaveBeenCalled()
  })

  it("does not steal focus after the user moves elsewhere", () => {
    const h = navigationHarness()
    const request = h.render(0)
    h.paint()
    request(h.source, () => {
      h.document.activeElement = {}
      h.propose(1)
    })
    h.settle()
    h.paint()
    expect(h.focus).not.toHaveBeenCalled()
  })

  it("clears a throwing navigation proposal before an external update", () => {
    const h = navigationHarness()
    const request = h.render(0)
    h.paint()
    expect(() =>
      request(h.source, () => {
        throw new Error("navigation rejected")
      })
    ).toThrow("navigation rejected")
    h.render(1)
    h.paint()
    expect(h.focus).not.toHaveBeenCalled()
  })

  it("does not focus on external updates without a navigation request", () => {
    const h = navigationHarness()
    h.render(0)
    h.paint()
    h.render(1)
    h.paint()
    expect(h.focus).not.toHaveBeenCalled()
  })
})
