import assert from "node:assert/strict"
import { EventEmitter } from "node:events"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { runInNewContext } from "node:vm"
import {
  advisoryRules,
  assertCalibration,
  assertSupportedTheme,
  blockingViolations,
  calibrationIds,
  calibrationLabels,
} from "../.storybook/a11y-policy.mjs"
import { curateControls } from "../.storybook/controls.ts"
import { applyPreviewTheme, bindDocsTheme } from "../.storybook/theme.mjs"
import {
  nativeFormAdapters,
  nativeResetCancellations,
} from "./native-form-contracts.mjs"
import { installVisualAssets } from "./visual-assets.mjs"
import { visualCaptureTiles } from "./visual-capture.mjs"
import {
  assertPrimaryBaselines,
  assertReleaseSelection,
  assertVisualCompletion,
  parseReleaseShard,
} from "./visual-completion.mjs"
import { assertDecodedVisualImages } from "./visual-image-readiness.mjs"
import {
  assertFloatingContainment,
  popupCheckpointStories,
  visibleFloatingSurfaces,
} from "./visual-popup-capture.mjs"
import {
  createThemeMatrix,
  createVisualMatrix,
  resolveVisualTheme,
} from "./visual-projects.mjs"
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

test("Controls preserve authored callback and JSX docs and normalized disabled editors", () => {
  const element = {
    $$typeof: Symbol.for("react.transitional.element"),
    props: {},
  }
  const argTypes = {
    onInputValueChange: {
      control: { type: "text" },
      description: "Receives the application-owned query.",
      table: { disable: false, category: "Query" },
    },
    onValueChange: {
      control: false,
      description: "Proposes a numeric draft.",
    },
    onChange: { control: { type: "object" }, table: { disable: false } },
    allResultsLink: {
      control: { type: "object" },
      description: "Application-owned full-results footer node.",
    },
    children: { control: { type: "object" }, table: { disable: false } },
    disabledText: { control: { disable: true, type: "object" } },
    disabledNode: { control: { disable: true }, description: "A JSX node." },
    hiddenNode: {
      description: "Intentionally hidden.",
      table: { disable: true },
    },
    inferredNode: {},
  }
  const result = curateControls({
    argTypes,
    initialArgs: {
      allResultsLink: element,
      children: [element],
      disabledText: "Do not infer a text editor",
      disabledNode: element,
      hiddenNode: element,
      inferredNode: element,
    },
  })
  for (const name of ["onInputValueChange", "onValueChange", "onChange"]) {
    assert.equal(result[name].control, false)
    assert.notEqual(result[name].table?.disable, true)
    assert.equal(result[name].description, argTypes[name].description)
  }
  assert.deepEqual(
    result.onInputValueChange.table,
    argTypes.onInputValueChange.table
  )
  for (const name of ["allResultsLink", "children"]) {
    assert.equal(result[name].control, false)
    assert.equal(result[name].table.disable, false)
  }
  assert.equal(
    result.allResultsLink.description,
    argTypes.allResultsLink.description
  )
  for (const name of ["disabledText", "disabledNode"]) {
    assert.deepEqual(result[name], argTypes[name])
  }
  for (const name of ["hiddenNode", "inferredNode"]) {
    assert.equal(result[name].control, false)
    assert.equal(result[name].table.disable, true)
  }
})

test("the maintained CI gate covers Node regressions, TSX tests and portable references", () => {
  const { scripts } = JSON.parse(read("../package.json"))
  assert.match(scripts.test, /pnpm test:node/)
  for (const file of [
    "test/visual-tooling.test.mjs",
    "test/token-utility-prefixes.test.mjs",
    "../../.agents/skills/figma-token-binding/scripts/merge-figma-themes.test.mjs",
    "scripts/*.node-test.mjs",
  ]) {
    assert.ok(scripts["test:node"].includes(file), `Missing Node gate: ${file}`)
  }
  assert.match(
    read("../../../.github/workflows/ui-quality.yml"),
    /pnpm --dir libs\/ui test\s/
  )
  const { include } = JSON.parse(read("../tsconfig.tests.json"))
  for (const pattern of [
    "tests/**/*.ts",
    "tests/**/*.tsx",
    "test/**/*.ts",
    "test/**/*.tsx",
  ]) {
    assert.ok(include.includes(pattern), `Missing test typecheck: ${pattern}`)
  }
  const { files } = JSON.parse(read("../agent-plugin/package.json"))
  assert.ok(files.includes("references"))
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

test("visual capture honors brand locks consistently without exempting any project from coverage", () => {
  const matrix = createVisualMatrix()
  for (const project of matrix) {
    const globals = { brand: project.brand, mode: project.colorScheme }
    for (const lock of [undefined, "akros", "neo"]) {
      const actual = resolveVisualTheme(globals, lock)
      const { root, classes, attributes } = themeRoot()
      applyPreviewTheme(root, globals, lock)
      assert.equal(attributes.get("data-theme") ?? "base", actual.brand)
      assert.ok(classes.has(actual.mode))
      if (lock === "akros") {
        assert.deepEqual(actual, { brand: "akros", mode: "light" })
      }
    }
  }
  assert.throws(() =>
    resolveVisualTheme({ brand: "base", mode: "light" }, "unknown")
  )
  assert.throws(() => resolveVisualTheme({ brand: "unknown", mode: "light" }))
  assert.throws(() => resolveVisualTheme({ brand: "akros", mode: "system" }))
  const story = { id: "pages-akros-admin-home-statistics--default" }
  const names = matrix.map(({ name }) => name)
  const executions = names.map((name) => successful(name, story.id))
  assertVisualCompletion([report(executions)], [story], names)
  for (const name of [
    "desktop-light",
    "akros-desktop-light",
    "akros-mobile-light",
  ]) {
    assert.throws(
      () =>
        assertVisualCompletion(
          [
            report(
              executions.filter((execution) => execution.projectName !== name)
            ),
          ],
          [story],
          names
        ),
      /Missing/
    )
  }
})

async function fakeAssetReplay() {
  const context = Object.assign(new EventEmitter(), {
    routeFromHAR: async () => {},
    route: async () => {},
  })
  const dispose = await installVisualAssets(context, {
    harPath: new URL("./fixtures/visual-assets/assets.har", import.meta.url)
      .pathname,
    origin: "http://127.0.0.1:6006",
  })
  const request = {
    url: () => "http://127.0.0.1:6006/stalled.png",
    resourceType: () => "image",
    failure: () => ({ errorText: "net::ERR_FAILED" }),
  }
  return { context, dispose, request }
}

test("asset idle barriers fail with pending URLs instead of consuming the whole test timeout", async () => {
  const { context, dispose, request } = await fakeAssetReplay()
  context.emit("request", request)
  await assert.rejects(
    dispose.whenIdle(10),
    /did not settle within 10ms: .*stalled.png/
  )
  context.emit("requestfinished", request)
  await dispose.whenIdle()
  await dispose()
})

test("asset cleanup reports only new failures, preserving the original replay diagnostic", async () => {
  const { context, dispose, request } = await fakeAssetReplay()
  context.emit("request", request)
  context.emit("requestfailed", request)
  await assert.rejects(
    dispose.whenIdle(),
    (error) =>
      error instanceof AggregateError &&
      error.errors.length === 1 &&
      error.errors[0].message.includes("stalled.png")
  )
  await dispose()
  context.emit("request", request)
  context.emit("requestfailed", request)
  await assert.rejects(dispose(), AggregateError)
})

function visualReplacement(overrides = {}) {
  return {
    style: { display: "block", visibility: "visible", opacity: "1" },
    getClientRects: () => [{ width: 100, height: 100 }],
    getAttribute: (name) =>
      name === "aria-label" ? "Unavailable product image" : null,
    hasAttribute: () => false,
    parentElement: null,
    ...overrides,
  }
}

function visualImage(overrides = {}) {
  const fallback = visualReplacement()
  return {
    currentSrc: "data:image/png;base64,invalid",
    complete: true,
    naturalWidth: 0,
    naturalHeight: 0,
    style: { display: "block", visibility: "visible", opacity: "0" },
    getClientRects: () => [{}],
    getAttribute: (name) => (name === "aria-hidden" ? "true" : null),
    closest: () => ({ querySelector: () => fallback }),
    decode: () => {
      throw new Error("Broken media must not be decoded")
    },
    ...overrides,
  }
}

function checkVisualImage(story, image) {
  return runInNewContext(
    `(${assertDecodedVisualImages.toString()})(${JSON.stringify(story)})`,
    {
      document: { images: [image] },
      getComputedStyle: (element) => element.style,
    }
  )
}

test("only explicit native fallback demos may capture the settled, hidden invalid source", async () => {
  for (const story of [
    "molecules-carousel--native-media-fallbacks",
    "molecules-productcard--native-media-fallback",
  ]) {
    await checkVisualImage(story, visualImage())
    for (const overrides of [
      { currentSrc: "https://fixture.invalid/real-broken-image.png" },
      { complete: false },
      { closest: () => null },
      { closest: () => ({ querySelector: () => null }) },
      { getAttribute: () => null },
      { style: { display: "block", visibility: "visible", opacity: "1" } },
      {
        closest: () => ({
          querySelector: () => ({
            style: { display: "none", visibility: "visible" },
            getClientRects: () => [],
            getAttribute: () => "Unavailable image",
          }),
        }),
      },
    ]) {
      await assert.rejects(
        checkVisualImage(story, visualImage(overrides)),
        /Visible image failed to load/
      )
    }
  }
  await assert.rejects(
    checkVisualImage("molecules-productcard--playground", visualImage()),
    /Visible image failed to load/
  )
})

test("native fallback replacements must have non-zero visible, accessibility-exposed boxes through every ancestor", async () => {
  for (const story of [
    "molecules-carousel--native-media-fallbacks",
    "molecules-productcard--native-media-fallback",
  ]) {
    for (const overrides of [
      { style: { opacity: "0" } },
      { style: { display: "none" } },
      { style: { visibility: "hidden" } },
      { style: { visibility: "collapse" } },
      {
        getAttribute: (name) =>
          name === "aria-hidden" ? "true" : "Unavailable product image",
      },
      { hasAttribute: (name) => name === "inert" },
    ]) {
      const hidden = visualReplacement(overrides)
      for (const fallback of [
        hidden,
        visualReplacement({
          parentElement: visualReplacement({ parentElement: hidden }),
        }),
      ]) {
        await assert.rejects(
          checkVisualImage(
            story,
            visualImage({ closest: () => ({ querySelector: () => fallback }) })
          ),
          /Visible image failed to load/
        )
      }
    }
    for (const overrides of [
      { getClientRects: () => [] },
      { getClientRects: () => [{ width: 0, height: 100 }] },
      { getClientRects: () => [{ width: 100, height: 0 }] },
      { getAttribute: () => " " },
    ]) {
      await assert.rejects(
        checkVisualImage(
          story,
          visualImage({
            closest: () => ({
              querySelector: () => visualReplacement(overrides),
            }),
          })
        ),
        /Visible image failed to load/
      )
    }
    await checkVisualImage(
      story,
      visualImage({
        closest: () => ({
          querySelector: () =>
            visualReplacement({ parentElement: visualReplacement() }),
        }),
      })
    )
  }
})

test("the fallback-ref demo permits only its declared invalid source with a visible exposed replacement", async () => {
  const story = "atoms-image--primitive-refs"
  const currentSrc = "data:image/png;base64,not-an-image"
  await checkVisualImage(story, visualImage({ currentSrc }))
  await assert.rejects(
    checkVisualImage(story, visualImage()),
    /Visible image failed to load/
  )
  for (const otherStory of [
    "atoms-image--playground",
    "molecules-carousel--native-media-fallbacks",
  ]) {
    await assert.rejects(
      checkVisualImage(otherStory, visualImage({ currentSrc })),
      /Visible image failed to load/
    )
  }
  for (const hidden of [
    visualReplacement({ style: { opacity: "0" } }),
    visualReplacement({ getAttribute: () => "true" }),
    visualReplacement({ hasAttribute: (name) => name === "inert" }),
  ]) {
    for (const replacement of [
      hidden,
      visualReplacement({ parentElement: hidden }),
    ]) {
      await assert.rejects(
        checkVisualImage(
          story,
          visualImage({
            currentSrc,
            closest: () => ({ querySelector: () => replacement }),
          })
        ),
        /Visible image failed to load/
      )
    }
  }
})

test("valid images, including off-screen carousel slides, must decode before capture", async () => {
  let decoded = 0
  await checkVisualImage(
    "molecules-carousel--playground",
    visualImage({
      currentSrc: "https://fixture.invalid/slide.png",
      naturalWidth: 800,
      naturalHeight: 600,
      decode: () => {
        decoded += 1
        return Promise.resolve()
      },
    })
  )
  assert.equal(decoded, 1)
  await assert.rejects(
    checkVisualImage(
      "molecules-carousel--playground",
      visualImage({
        currentSrc: "https://fixture.invalid/slide.png",
        naturalWidth: 800,
        naturalHeight: 600,
        decode: () => Promise.reject(new Error("decode rejected")),
      })
    ),
    /decode rejected/
  )
})

test("oversized visual roots tile the entire document region without gaps or exceeding bitmap bounds", () => {
  assert.deepEqual(
    visualCaptureTiles({ x: 8, y: 8, width: 390, height: 16_000 }),
    []
  )
  for (const bounds of [
    { x: 8, y: 8, width: 390, height: 45_123 },
    { x: 1.5, y: 20.25, width: 33_000.25, height: 32_999.5 },
  ]) {
    const tiles = visualCaptureTiles(bounds)
    assert.ok(tiles.length > 1)
    assert.equal(tiles[0].suffix, "")
    assert.equal(new Set(tiles.map(({ suffix }) => suffix)).size, tiles.length)
    const left = Math.floor(bounds.x)
    const top = Math.floor(bounds.y)
    const right = Math.ceil(bounds.x + bounds.width)
    const bottom = Math.ceil(bounds.y + bounds.height)
    let area = 0
    for (const { clip } of tiles) {
      assert.ok(clip.width > 0 && clip.width <= 16_000)
      assert.ok(clip.height > 0 && clip.height <= 16_000)
      assert.ok(clip.x >= left && clip.x + clip.width <= right)
      assert.ok(clip.y >= top && clip.y + clip.height <= bottom)
      area += clip.width * clip.height
      for (const { clip: other } of tiles) {
        if (clip === other) {
          continue
        }
        assert.ok(
          clip.x + clip.width <= other.x ||
            other.x + other.width <= clip.x ||
            clip.y + clip.height <= other.y ||
            other.y + other.height <= clip.y
        )
      }
    }
    assert.equal(area, (right - left) * (bottom - top))
  }
  for (const bounds of [
    { x: 0, y: 0, width: 0, height: 1 },
    { x: 0, y: 0, width: 1, height: Number.NaN },
    { x: -1, y: 0, width: 1, height: 1 },
  ]) {
    assert.throws(
      () => visualCaptureTiles(bounds),
      /Invalid visual capture bounds/
    )
  }
  const primary = read("./visual.spec.ts")
  assert.match(primary, /type: "visual-capture-tiles"/)
  assert.match(
    primary,
    /for \(const tile of tiles.length \? tiles : \[null\]\)/
  )
  assert.match(primary, /clip: tile.clip/)
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
  // Theme expansion must reach the keyboard helper, not silently fall back to
  // its default theme. Retain both controlled authority modes on every surface.
  assert.match(
    spec,
    /for \(const theme of \[\s*\{ brand: "akros", mode: "light" \},\s*\{ brand: "base", mode: "light" \},\s*\{ brand: "base", mode: "dark" \},?\s*\]\)/
  )
  assert.match(spec, /for \(const authority of \["accept", "refuse"\]\)/)
  assert.match(
    spec,
    /await checkNativeDateKeyboardAuthority\(\s*page,\s*authority,\s*theme\s*\)/
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

test("a11y enforcement blocks WCAG A/AA rules and only reports advisory ones", () => {
  assert.deepEqual(blockingViolations(advisoryRules.map((id) => ({ id }))), [])
  assert.deepEqual(
    blockingViolations([
      { id: "apca-contrast" },
      { id: "button-name" },
      { id: "button-name" },
      { id: "color-contrast" },
    ]),
    ["button-name", "color-contrast"]
  )
})

test("release shards are validated index/total pairs", () => {
  assert.equal(parseReleaseShard(undefined), undefined)
  assert.equal(parseReleaseShard(""), undefined)
  assert.deepEqual(parseReleaseShard("2/4"), { index: 2, total: 4 })
  for (const value of ["0/4", "5/4", "1/0", "a/4", "1/4/2", "1/64"]) {
    assert.throws(() => parseReleaseShard(value))
  }
})
