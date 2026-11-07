// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import postcss, { type AtRule, type Declaration, type Rule } from "postcss"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Steps, type StepsProps } from "../src/molecules/steps"

const SELECTOR_WHITESPACE = /\s+/g
const labels = ["Brief", "Inputs", "Review"]
const descriptions = [
  "Define scope.",
  "Collect the important inputs and confirm ownership before continuing.",
  "Review and publish.",
]
const css = postcss.parse(
  readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../src/tokens/components/molecules/_steps.css"
    ),
    "utf8"
  )
)

function renderSteps(
  props: Pick<
    StepsProps,
    "dir" | "orientation" | "size" | "variant" | "linear"
  > = {}
) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(
    h(
      Steps,
      { count: 3, defaultStep: 1, ...props },
      h(
        Steps.List,
        null,
        ...labels.map((label, index) =>
          h(
            Steps.Item,
            { index, key: label },
            h(
              Steps.Trigger,
              null,
              h(Steps.Indicator),
              h(
                Steps.ItemText,
                { title: label },
                h(Steps.Title, null, label),
                h(Steps.Description, null, descriptions[index])
              )
            ),
            h(Steps.Separator)
          )
        )
      ),
      h(
        Steps.Panels,
        null,
        ...labels.map((label, index) =>
          h(Steps.Content, { index, key: label }, `${label} panel`)
        ),
        h(Steps.CompletedContent, null, "Workflow complete"),
        h(
          Steps.Navigation,
          null,
          h(Steps.PrevTrigger, null, "Back"),
          h(Steps.NextTrigger, null, "Continue")
        )
      )
    )
  )
  return canvas
}

function desktopAlignment() {
  const utility = css.nodes.find(
    (node): node is AtRule =>
      node.type === "atrule" &&
      node.name === "utility" &&
      node.params === "steps-label-alignment"
  )
  if (!utility) {
    throw new Error("Missing Steps label-alignment utility")
  }
  const desktop = utility.nodes?.[0]
  if (desktop?.type !== "atrule") {
    throw new Error("Missing Steps desktop variant")
  }
  return desktop
}

function rule(parent: AtRule | Rule, selector: string) {
  const result = parent.nodes?.find(
    (node): node is Rule =>
      node.type === "rule" &&
      node.selector.replaceAll(SELECTOR_WHITESPACE, "") ===
        selector.replaceAll(SELECTOR_WHITESPACE, "")
  )
  if (!result) {
    throw new Error(`Missing Steps selector: ${selector}`)
  }
  return result
}

function declarations(node: Rule) {
  return Object.fromEntries(
    node.nodes
      .filter((entry): entry is Declaration => entry.type === "decl")
      .map((entry) => [entry.prop, entry.value])
  )
}

// Source/SSR contracts only. Story plays measure real text/indicator axes,
// connectors and viewport containment with the existing one-CSS-pixel budget.
describe("Steps label and description hierarchy", () => {
  it.each(["ltr", "rtl"] as const)(
    "centres mobile text below its indicator and restores desktop start alignment in %s",
    (dir) => {
      const canvas = renderSteps({ dir })
      const wrappers = canvas.querySelectorAll('[data-part="item-text"]')
      expect(wrappers).toHaveLength(3)
      for (const [index, wrapper] of Array.from(wrappers).entries()) {
        expect(wrapper.getAttribute("data-scope")).toBe("steps")
        expect(wrapper.getAttribute("title")).toBe(labels[index])
        expect(wrapper.classList.contains("min-w-0")).toBe(true)
        expect(
          wrapper.classList.contains(
            "data-[orientation=horizontal]:items-center"
          )
        ).toBe(true)
        expect(
          wrapper.classList.contains(
            "data-[orientation=horizontal]:text-center"
          )
        ).toBe(true)
        expect(
          wrapper.classList.contains(
            "sm:data-[orientation=horizontal]:items-start"
          )
        ).toBe(true)
        expect(
          wrapper.classList.contains(
            "sm:data-[orientation=horizontal]:text-start"
          )
        ).toBe(true)
      }
    }
  )

  it("keeps description weight independent of inherited Button typography in every state", () => {
    const canvas = renderSteps()
    const titles = canvas.querySelectorAll('[data-part="title"]')
    const helpers = canvas.querySelectorAll('[data-part="description"]')
    expect(Array.from(titles, (title) => title.textContent)).toEqual(labels)
    expect(Array.from(helpers, (helper) => helper.textContent)).toEqual(
      descriptions
    )
    for (const helper of helpers) {
      expect(helper.classList.contains("font-steps-description")).toBe(true)
      expect(helper.classList.contains("break-words")).toBe(true)
      expect(helper.classList.contains("max-w-full")).toBe(true)
      expect(helper.classList.contains("truncate")).toBe(false)
      expect(helper.classList.contains("overflow-hidden")).toBe(false)
    }
    for (const title of titles) {
      expect(title.classList.contains("font-steps-title")).toBe(true)
      expect(title.classList.contains("max-w-full")).toBe(true)
    }
    expect(titles[0]?.hasAttribute("data-complete")).toBe(true)
    expect(titles[1]?.hasAttribute("data-current")).toBe(true)
    expect(titles[2]?.hasAttribute("data-incomplete")).toBe(true)
    expect(helpers[0]?.hasAttribute("data-complete")).toBe(true)
    expect(helpers[1]?.hasAttribute("data-current")).toBe(true)
    expect(helpers[2]?.hasAttribute("data-incomplete")).toBe(true)
    const weights: Record<string, string> = {}
    css.walkAtRules("theme", (theme) => {
      theme.walkDecls((declaration) => {
        weights[declaration.prop] = declaration.value
      })
    })
    expect(weights["--font-weight-steps-description"]).toBe(
      "var(--font-weight-normal)"
    )
    expect(weights["--font-weight-steps-title"]).toBe(
      "var(--font-weight-medium)"
    )
  })

  it("anchors desktop indicators and connectors to the same row only for described horizontal lists", () => {
    const desktop = desktopAlignment()
    expect(desktop.name).toBe("variant")
    expect(desktop.params).toBe("sm")
    const list = rule(
      desktop,
      '&[data-orientation="horizontal"]:has(> [data-part="item"] [data-part="description"])'
    )
    const item = rule(
      list,
      '& > [data-part="item"]:has([data-part="indicator"])'
    )
    expect(declarations(item)).toEqual({ "align-items": "flex-start" })
    expect(declarations(rule(item, '& > [data-part="trigger"]'))).toEqual({
      "align-items": "flex-start",
    })
    const separator = declarations(rule(item, '& > [data-part="separator"]'))
    expect(separator["margin-block-start"]).toContain("--steps-connector-inset")
    expect(separator["margin-block-start"]).toContain(
      "--steps-connector-indicator-size"
    )
    expect(separator["margin-block-start"]).toContain(
      "--size-steps-indicator-md"
    )
    expect(separator["margin-block-start"]).toContain(
      "--height-steps-separator"
    )
    expect(separator).not.toHaveProperty("left")
    expect(separator).not.toHaveProperty("right")
    expect(separator).not.toHaveProperty("display")
    expect(separator).not.toHaveProperty("overflow")
    expect(
      renderSteps()
        .querySelector('[data-part="list"]')
        ?.classList.contains("steps-label-alignment")
    ).toBe(true)
  })

  it.each(["subtle", "solid"] as const)(
    "preserves vertical text, step order and linear navigation semantics for %s",
    (variant) => {
      const canvas = renderSteps({
        orientation: "vertical",
        dir: "rtl",
        variant,
        linear: true,
      })
      expect(canvas.querySelectorAll('[role="listitem"]')).toHaveLength(3)
      expect(canvas.querySelectorAll('[data-part="indicator"]')).toHaveLength(3)
      expect(canvas.querySelectorAll('[data-part="separator"]')).toHaveLength(3)
      expect(
        canvas.querySelectorAll('[data-part="trigger"][disabled]')
      ).toHaveLength(3)
      expect(
        canvas
          .querySelector('[data-part="trigger"][aria-current="step"]')
          ?.querySelector('[data-part="title"]')?.textContent
      ).toBe("Inputs")
      expect(
        canvas.querySelector('[data-part="content"]:not([hidden])')?.textContent
      ).toBe("Inputs panel")
      expect(
        canvas.querySelector('[data-part="prev-trigger"]')?.textContent
      ).toBe("Back")
      expect(
        canvas.querySelector('[data-part="next-trigger"]')?.textContent
      ).toBe("Continue")
      for (const wrapper of canvas.querySelectorAll(
        '[data-part="item-text"]'
      )) {
        expect(wrapper.getAttribute("data-orientation")).toBe("vertical")
        expect(
          wrapper.classList.contains("data-[orientation=vertical]:items-start")
        ).toBe(true)
      }
    }
  )
})
