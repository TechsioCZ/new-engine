import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { runInNewContext } from "node:vm"
import {
  assertCalibration,
  assertSupportedTheme,
  calibrationIds,
  calibrationLabels,
} from "../.storybook/a11y-policy.mjs"
import { curateControls } from "../.storybook/controls.ts"
import { applyPreviewTheme, bindDocsTheme } from "../.storybook/theme.mjs"
import {
  nativeFormAdapters,
  nativeResetCancellations,
} from "./native-form-contracts.mjs"
import {
  assertPrimaryBaselines,
  assertReleaseSelection,
  assertVisualCompletion,
} from "./visual-completion.mjs"
import {
  assertFloatingContainment,
  popupCheckpointStories,
  visibleFloatingSurfaces,
} from "./visual-popup-capture.mjs"
import { createThemeMatrix, createVisualMatrix } from "./visual-projects.mjs"
import {
  hasClientDirective,
  needsClientBoundary,
} from "./visual-rsc-boundaries.mjs"

const read = (relative) =>
  readFileSync(new URL(relative, import.meta.url), "utf8")

test("visual and accessibility defaults cover every registry pair, including both Akros devices", () => {
  const pairs = createThemeMatrix()
  assert.deepEqual(
    pairs.map(({ brand, mode }) => `${brand}/${mode}`),
    [
      "base/light",
      "base/dark",
      "neo/light",
      "neo/dark",
      "business/light",
      "akros/light",
    ]
  )
  for (const { brand, mode } of pairs) {
    assertSupportedTheme(brand, mode)
  }
  const matrix = createVisualMatrix()
  assert.equal(matrix.length, 12)
  assert.equal(new Set(matrix.map((project) => project.name)).size, 12)
  assert.deepEqual(
    createVisualMatrix("akros").map((project) => project.name),
    ["akros-desktop-light", "akros-mobile-light"]
  )
  assert.throws(() => createVisualMatrix("invalid"))
  assert.throws(() => createVisualMatrix(""))
  assert.throws(() => assertSupportedTheme("akros", "dark"))
  assert.throws(() => assertSupportedTheme("business", "dark"))
})

test("release readiness rejects all narrowed selections and snapshot updates", () => {
  assertReleaseSelection([], {})
  for (const args of [
    ["--project=desktop"],
    ["--update-snapshots"],
    ["visual.spec.ts"],
    ["--grep", "Button"],
  ]) {
    assert.throws(() => assertReleaseSelection(args, {}))
  }
  assert.throws(() =>
    assertReleaseSelection([], { VISUAL_BRANDS: "base,neo,business" })
  )
  assert.throws(() =>
    assertReleaseSelection([], { TEST_STORIES: "atoms-button--playground" })
  )
  for (const env of [
    { TEST_BASE_URL: "http://example.test" },
    { VISUAL_STORYBOOK_STATIC_DIR: "/unrelated-build" },
    { VISUAL_ASSET_HAR_PATH: "/unrelated-assets" },
    { PLAYWRIGHT_STORYBOOK_REBUILD: "0" },
  ]) {
    assert.throws(() => assertReleaseSelection([], env))
  }
})

const report = (tests) => ({
  errors: [],
  stats: { unexpected: 0, flaky: 0 },
  suites: [
    {
      specs: tests.map((execution) => ({
        file: "visual.spec.ts",
        tests: [execution],
      })),
    },
  ],
})
const successful = (projectName, id) => ({
  projectName,
  status: "expected",
  annotations: [{ type: "visual-story-id", description: id }],
  results: [{ status: "passed" }],
})

test("completion requires exact unique successfully executed story/project identities", () => {
  const stories = [{ id: "atoms-button--playground" }]
  const projects = ["akros-desktop-light", "akros-mobile-light"]
  const complete = projects.map((project) => successful(project, stories[0].id))
  assertVisualCompletion([report(complete)], stories, projects)
  assert.throws(
    () =>
      assertVisualCompletion(
        [report([complete[0], complete[0]])],
        stories,
        projects
      ),
    /Duplicate/
  )
  assert.throws(
    () => assertVisualCompletion([report([complete[0]])], stories, projects),
    /Missing/
  )
  assert.throws(() =>
    assertVisualCompletion(
      [report([{ ...complete[0], status: "skipped" }, complete[1]])],
      stories,
      projects
    )
  )
  assert.throws(() =>
    assertVisualCompletion(
      [report([{ ...complete[0], results: [] }, complete[1]])],
      stories,
      projects
    )
  )
  assert.throws(() =>
    assertVisualCompletion(
      [report([successful(projects[0], "wrong-story"), complete[1]])],
      stories,
      projects
    )
  )
  assert.throws(() =>
    assertVisualCompletion(
      [{ ...report(complete), stats: { unexpected: 0, flaky: 1 } }],
      stories,
      projects
    )
  )
})

test("calibration requires exact expected rules and nodes at each threshold", () => {
  const low = { html: "<p>Low contrast text (should fail APCA)</p>" }
  const small = {
    html: "<p>Sub-fluent label (should fail size at gold/silver)</p>",
  }
  for (const id of calibrationIds) {
    const result = {
      violations: [
        { id: "color-contrast", nodes: [low] },
        { id: "color-contrast-enhanced", nodes: [small] },
        {
          id: "apca-contrast",
          nodes: id.endsWith("--bronze") ? [low] : [low, small],
        },
      ],
    }
    assertCalibration(id, calibrationLabels, result)
    assert.throws(
      () => assertCalibration(id, [calibrationLabels[0]], result),
      /controls are missing/
    )
    assert.throws(() =>
      assertCalibration(id, calibrationLabels, { violations: [] })
    )
    assert.throws(() =>
      assertCalibration(id, calibrationLabels, {
        ...result,
        violations: [
          ...result.violations,
          { id: "image-alt", nodes: [{ html: "<img>" }] },
        ],
      })
    )
    assert.throws(() =>
      assertCalibration(id, calibrationLabels, {
        violations: result.violations.map((rule) => ({
          ...rule,
          nodes: [
            ...rule.nodes,
            { html: "<p>High contrast text (should pass)</p>" },
          ],
        })),
      })
    )
  }
})

test("client ownership is selective and emitted directives must be in the prologue", () => {
  assert.equal(needsClientBoundary("const state = useMachine(machine)"), true)
  assert.equal(
    needsClientBoundary("return createPortal(children, document.body)"),
    true
  )
  assert.equal(
    needsClientBoundary('import { createContext as makeContext } from "react"'),
    true
  )
  assert.equal(
    needsClientBoundary(
      'import { type useEffect, createElement } from "react"'
    ),
    false
  )
  assert.equal(
    needsClientBoundary('import type { useState } from "react"'),
    false
  )
  assert.equal(
    needsClientBoundary(
      "export const Button = () => <button onClick={() => 1} />"
    ),
    true
  )
  assert.equal(
    needsClientBoundary("export const Text = () => <p>Hello</p>"),
    false
  )
  assert.equal(
    hasClientDirective('/* comment */ "use client"; import React from "react"'),
    true
  )
  assert.equal(
    hasClientDirective('import React from "react"; "use client"'),
    false
  )
  assert.equal(
    hasClientDirective('// "use client"\nexport const value = 1'),
    false
  )
})

test("CI and forced publication require the same immutable-SHA quality workflow", () => {
  const ci = read("../../../.github/workflows/ci.yml")
  const release = read("../../../.github/workflows/ui-release.yml")
  const quality = read("../../../.github/workflows/ui-quality.yml")
  const a11y = read("../../../.github/workflows/storybook-a11y.yml")
  assert.match(
    ci,
    /ui-quality:\s+uses: \.\/\.github\/workflows\/ui-quality.yml/
  )
  assert.match(ci, /needs:[\s\S]*- main\s+- ui-quality/)
  assert.match(release, /needs: \[check-affected, validate\]/)
  assert.match(release, /needs.validate.result == 'success'/)
  assert.match(
    release,
    /validate:[\s\S]*uses: \.\/\.github\/workflows\/ui-quality.yml[\s\S]*sha: \$\{\{ github.sha \}\}/
  )
  assert.match(release, /release:[\s\S]*ref: \$\{\{ github.sha \}\}/)
  for (const command of [
    "typecheck",
    "test",
    "validate:tokens",
    "check:package",
    "test:components:release",
  ]) {
    assert.ok(quality.includes(`pnpm --dir libs/ui ${command}`))
  }
  assert.match(
    quality,
    /accessibility:\s+uses: \.\/\.github\/workflows\/storybook-a11y.yml/
  )
  assert.match(a11y, /A11Y_REPORT_FAIL_ON_VIOLATIONS: "true"/)
  assert.doesNotMatch(a11y, /vars.A11Y_REPORT_FAIL_ON_VIOLATIONS/)
})

test("stylesheet discovery and documentation commands match package contracts", () => {
  const css = read("../src/tokens/_tokens-base.css")
  assert.match(css, /@source "\.\.\/\.\.\/dist\/\*\*\/\*.js";/)
  for (const entry of ["index.css", "tokens-only.css"]) {
    assert.ok(read(`../src/tokens/${entry}`).includes("_tokens-base.css"))
  }
  for (const file of [
    "../AGENTS.md",
    "../skills/component-authoring/SKILL.md",
    "../skills/storybook-authoring/SKILL.md",
  ]) {
    assert.doesNotMatch(read(file), /nx run ui:/)
  }
  assert.match(read("../AGENTS.md"), /pnpm --dir libs\/ui validate:tokens/)
  assert.doesNotMatch(
    read("../README.md"),
    /Local dry run:|ui\/brands\/customer-a/
  )
  assert.match(read("../.storybook/main.ts"), /getting-started.mdx/)
  assert.match(
    read("../.storybook/getting-started.mdx"),
    /@techsio\/ui-kit\/atoms\/button/
  )
})

test("inferred Controls hide internals, edit strings as text and never serialize React payloads", () => {
  const result = curateControls({
    argTypes: {
      ref: {},
      contentRef: {},
      id: {},
      onChange: {},
      title: { control: { type: "object" } },
      size: { control: { type: "select" } },
      documented: { control: false },
    },
    initialArgs: {
      title: "Product details",
      children: {
        $$typeof: Symbol.for("react.transitional.element"),
        props: {},
      },
      items: [
        { content: { $$typeof: Symbol.for("react.transitional.element") } },
      ],
      size: "md",
    },
  })
  for (const name of ["ref", "contentRef", "id"]) {
    assert.equal(result[name].table.disable, true)
  }
  assert.equal(result.onChange.control, false)
  assert.deepEqual(result.title.control, { type: "text" })
  assert.equal(result.children.control, false)
  assert.equal(result.items.control, false)
  assert.deepEqual(result.size.control, { type: "select" })
  assert.equal(result.documented.control, false)
})

function themeRoot() {
  const classes = new Set(["app-shell"])
  const attributes = new Map()
  return {
    classes,
    attributes,
    root: {
      classList: {
        add: (...names) => {
          for (const name of names) {
            classes.add(name)
          }
        },
        remove: (...names) => {
          for (const name of names) {
            classes.delete(name)
          }
        },
      },
      setAttribute: (name, value) => attributes.set(name, value),
      removeAttribute: (name) => attributes.delete(name),
    },
  }
}

test("standalone Docs replay initial globals, follow live changes and clean up listeners", () => {
  const { root, classes, attributes } = themeRoot()
  const listeners = new Map()
  let history = { setGlobals: [{ globals: { brand: "base", mode: "dark" } }] }
  const channel = {
    last: (name) => history[name],
    on: (name, listener) => listeners.set(name, listener),
    off: (name, listener) => {
      assert.equal(listeners.get(name), listener)
      listeners.delete(name)
    },
  }
  const cleanup = bindDocsTheme(channel, root, { brand: "base", mode: "light" })
  assert.deepEqual([...classes], ["app-shell", "dark"])
  const update = listeners.get("globalsUpdated")
  update({ globals: { brand: "akros", mode: "dark" } })
  assert.equal(attributes.get("data-theme"), "akros")
  assert.deepEqual([...classes], ["app-shell", "light"])
  update({ globals: { brand: "base", mode: "light" } })
  assert.equal(attributes.has("data-theme"), false)
  update({ globals: { brand: "base", mode: "system" } })
  assert.deepEqual([...classes], ["app-shell"])
  cleanup()
  assert.equal(listeners.size, 0)

  // A manager update before mounting wins over the older setGlobals event.
  history = {
    ...history,
    globalsUpdated: [{ globals: { brand: "neo", mode: "dark" } }],
  }
  bindDocsTheme(channel, root)()
  assert.equal(attributes.get("data-theme"), "neo")
  assert.deepEqual([...classes], ["app-shell", "dark"])
  history = {}
  bindDocsTheme(channel, root, { brand: "business", mode: "dark" })()
  assert.equal(attributes.get("data-theme"), "business")
  assert.deepEqual([...classes], ["app-shell", "light"])
  applyPreviewTheme(root, { brand: "__proto__", mode: "invalid" })
  assert.equal(attributes.has("data-theme"), false)
  assert.deepEqual([...classes], ["app-shell", "light"])
  applyPreviewTheme(root, { brand: "base", mode: "dark" }, "akros")
  assert.equal(attributes.get("data-theme"), "akros")
  assert.deepEqual([...classes], ["app-shell", "light"])
})

test("release preflight requires exact reviewed baselines for each story and device", () => {
  const stories = [{ id: "atoms-button--playground" }]
  const projects = createVisualMatrix()
  const files = new Set(
    projects.map((project) => {
      const device = project.isMobile ? "mobile" : "desktop"
      const suffix =
        project.brand === "base"
          ? `${device}${project.colorScheme === "dark" ? "-dark" : ""}`
          : project.name
      return `${stories[0].id}-${suffix}-linux.png`
    })
  )
  assertPrimaryBaselines(stories, projects, files)
  files.delete("atoms-button--playground-akros-mobile-light-linux.png")
  files.add("pages-akros-dashboard--playground-desktop-linux.png")
  assert.throws(
    () => assertPrimaryBaselines(stories, projects, files),
    /Missing 1 reviewed primary visual baselines/
  )
  assert.throws(
    () =>
      assertPrimaryBaselines(
        [{ id: "new-story--playground" }],
        projects,
        files
      ),
    /Missing 12/
  )
})

test("role-free portal anatomy is discovered and hidden surfaces are excluded", async () => {
  const bounds = {
    x: 12,
    y: 20,
    left: 12,
    top: 20,
    right: 112,
    bottom: 100,
    width: 100,
    height: 80,
  }
  const parent = {
    parentElement: null,
    getBoundingClientRect: () => bounds,
    style: {},
  }
  const element = {
    parentElement: parent,
    getAttribute: (name) =>
      ({ "data-scope": "custom-calendar", "data-part": "content" })[name] ??
      null,
    getBoundingClientRect: () => bounds,
    getClientRects: () => [bounds],
    querySelectorAll: () => [],
    closest: (selector) => (selector.includes("positioner") ? parent : null),
    style: {},
  }
  let selected
  const page = {
    evaluate: async (evaluate) =>
      runInNewContext(`(${evaluate.toString()})()`, {
        document: {
          getElementById: () => ({ contains: () => false }),
          querySelectorAll: (selector) => {
            selected = selector
            return [element, { ...element, style: { display: "none" } }]
          },
        },
        getComputedStyle: (node) => ({
          display: "block",
          visibility: "visible",
          ...node.style,
        }),
        scrollX: 0,
        scrollY: 0,
      }),
  }
  const surfaces = await visibleFloatingSurfaces(page)
  assert.ok(selected.includes('[data-part="positioner"] [data-part="content"]'))
  assert.equal(surfaces.length, 1)
  assert.equal(surfaces[0].role, null)
  assert.equal(surfaces[0].scope, "custom-calendar")
  assert.equal(surfaces[0].external, true)
  assertFloatingContainment(surfaces, { width: 390, height: 844 })

  // The panel and its positioner fit, but a descendant can still be entirely
  // outside overflow-hidden bounds (the expanded CascadeSelect Phones bug).
  const descendant = {
    ...element,
    parentElement: element,
    getAttribute: (name) => (name === "aria-label" ? "Phones" : null),
    getBoundingClientRect: () => ({
      ...bounds,
      top: 120,
      bottom: 150,
      y: 120,
      height: 30,
    }),
  }
  element.querySelectorAll = () => [descendant]
  for (const overflowY of ["hidden", "clip"]) {
    element.style = { overflowY }
    const clippedHierarchy = await visibleFloatingSurfaces(page)
    assert.equal(clippedHierarchy[0].clipped, false)
    assert.deepEqual(Array.from(clippedHierarchy[0].clippedDescendants), [
      "Phones",
    ])
    assert.throws(
      () =>
        assertFloatingContainment(clippedHierarchy, {
          width: 390,
          height: 844,
        }),
      /descendants are clipped by an ancestor/
    )
  }
  // Scrollable lists legitimately contain offscreen rows. Required checkpoint
  // rows separately use IntersectionObserver to reject scrollport clipping.
  element.style = { overflowY: "auto" }
  assertFloatingContainment(await visibleFloatingSurfaces(page), {
    width: 390,
    height: 844,
  })
  element.style = {}
  element.querySelectorAll = () => []
  parent.style = { overflowX: "hidden" }
  parent.getBoundingClientRect = () => ({ ...bounds, right: 80, width: 68 })
  const clipped = await visibleFloatingSurfaces(page)
  assert.equal(clipped[0].clipped, true)
  assert.throws(
    () => assertFloatingContainment(clipped, { width: 390, height: 844 }),
    /clipped by an ancestor/
  )
})

test("floating captures reject missing, clipped and out-of-PNG content or positioners", () => {
  const surface = {
    scope: "cascade-select",
    part: "content",
    role: null,
    x: 10,
    y: 20,
    width: 200,
    height: 100,
    clipped: false,
    inaccessible: false,
    positioner: null,
  }
  const image = { width: 390, height: 844 }
  assertFloatingContainment([surface], image)
  // Visible background dialogs remain capturable when a child overlay makes
  // them inert. Active checkpoint accessibility is checked separately.
  assertFloatingContainment([{ ...surface, inaccessible: true }], image)
  for (const surfaces of [
    [],
    [{ ...surface, x: -5 }],
    [{ ...surface, y: -5 }],
    [{ ...surface, width: 400 }],
    [{ ...surface, height: 900 }],
    [{ ...surface, clipped: true }],
    [{ ...surface, clippedDescendants: ["Phones"] }],
    [{ ...surface, positioner: { x: 380, y: 20, width: 20, height: 100 } }],
  ]) {
    assert.throws(() => assertFloatingContainment(surfaces, image))
  }
})

test("primary screenshot comparisons retain story annotations and deterministic popup checkpoints", () => {
  const primary = read("./visual.spec.ts")
  assert.match(primary, /type: "visual-story-id",\s+description: story.id/)
  assert.match(primary, /await visibleFloatingSurfaces\(page\)/)
  assert.match(
    primary,
    /await checkStoryPopupCheckpoints\(page, story.id, \(suffix\) =>\s+capture\(suffix, true\)/
  )
  assert.match(
    primary,
    /assertFloatingContainment\(surfaces, PNG.sync.read\(actual\)\)/
  )
  for (const id of [
    "molecules-cascadeselect--playground",
    "molecules-datepicker--playground",
    "molecules-menu--nested-menu",
  ]) {
    assert.ok(popupCheckpointStories.some(([story]) => story === id))
  }
  const checkpoints = read("./visual-popup-capture.mjs")
  assert.match(checkpoints, /--popup-hierarchy/)
  assert.match(checkpoints, /--popup-submenu/)
  assert.match(checkpoints, /getByRole\("grid"\)/)
  assert.match(
    checkpoints,
    /getByRole\("treeitem", \{ name: "Phones", exact: true \}\)\s*\)\.toBeInViewport\(\{ ratio: 1 \}\)/
  )
})

test("native-form lifecycle matrix uses all maintained adapters without disabling mobile keyboard coverage", () => {
  assert.equal(new Set(nativeFormAdapters.map(({ id }) => id)).size, 15)
  assert.deepEqual(nativeResetCancellations, [
    "none",
    "early-native",
    "late-native",
    "early-react",
    "late-react",
  ])
  const spec = read("./native-form.behavior.spec.ts")
  for (const helper of [
    "checkNativeReset",
    "checkNativeAuthority",
    "checkNativeOwnership",
    "checkNativeFieldsets",
  ]) {
    assert.ok(spec.includes(`await ${helper}(page, adapter`))
  }
  assert.doesNotMatch(spec, /test\.(?:skip|fixme)|isMobile|browserName/)
  assert.match(
    spec,
    /await checkNativeDateKeyboardAuthority\(page, authority\)/
  )
  const nativeContracts = read("./native-form-contracts.mjs")
  assert.doesNotMatch(nativeContracts, /resetProposal|resetCallbacks/)
  assert.match(nativeContracts, /changed: true, callbacks: 2/)
  const shared = read("./visual-shared-contracts.mjs")
  assert.match(
    shared,
    /await radios.nth\(0\).press\("ArrowUp"\)\s+await expect\(radios.nth\(2\)\).toBeChecked\(\)/
  )
  assert.doesNotMatch(shared, /test\.(?:skip|fixme)/)
  const fixture = read("../stories/testing/native-form-contracts.stories.tsx")
  for (const { id } of nativeFormAdapters) {
    assert.ok(fixture.includes(`case "${id}"`))
  }
  const config = read("../playwright.config.mts")
  assert.match(config, /"desktop", "mobile"/)
  assert.match(config, /"webkit"/)
  assert.match(config, /"chromium"/)
})
