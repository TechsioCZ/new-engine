import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { compile } from "tailwindcss"
import {
  collectFileErrors,
  extractTailwindClasses,
  findMissingTokens,
} from "./validate-token-usage.js"

const WHITESPACE = /\s+/g

describe("fractional dimension utilities", () => {
  for (const [prefix, property] of [
    ["w", "width"],
    ["h", "height"],
    ["min-w", "min-width"],
    ["max-w", "max-width"],
    ["min-h", "min-height"],
    ["max-h", "max-height"],
  ]) {
    it(`accepts token-free ${prefix} fractions supported by Tailwind`, async () => {
      const compiler = await compile("@tailwind utilities;")
      const css = compiler.build([`${prefix}-4/5`])
      assert.ok(
        css.replace(WHITESPACE, "").includes(`${property}:calc(4/5*100%);`)
      )
      assert.deepEqual(findMissingTokens(`${prefix}-4/5`, new Set()), [])
    })
  }

  it("accepts fractions after existing responsive and state modifiers", () => {
    for (const className of [
      "sm:w-1/2",
      "md:hover:max-w-2/3",
      "data-[state=open]:min-h-3/4",
      "w-0/2",
      "w-12/7",
    ]) {
      assert.deepEqual(findMissingTokens(className, new Set()), [], className)
    }
  })

  it("does not exempt malformed or non-dimension slash values", () => {
    for (const className of [
      "w-1/0",
      "w-1.5/2",
      "w-01/2",
      "w-1/-2",
      "w-card/2",
      "p-4/5",
      "bg-missing/50",
      "text-missing/50",
    ]) {
      assert.ok(findMissingTokens(className, new Set()).length > 0, className)
    }
  })

  it("still requires custom dimension tokens", () => {
    assert.ok(findMissingTokens("md:w-card", new Set()).length > 0)
    assert.deepEqual(
      findMissingTokens("md:w-card", new Set(["--width-card"])),
      []
    )
  })
})

it("accepts decoration-current without inventing a --color-current token", async () => {
  const compiler = await compile("@tailwind utilities;")
  assert.ok(
    compiler
      .build(["decoration-current"])
      .toLowerCase()
      .includes("currentcolor")
  )
  assert.deepEqual(findMissingTokens("decoration-current", new Set()), [])
})

describe("complete terminal utility validation", () => {
  for (const modifier of [
    "group-data-[state=open]",
    "aria-[invalid=true]",
    "has-[input:focus]",
    "[&>input:focus]",
    "2xl",
    "supports-[display:grid]",
    "peer-aria-expanded/menu",
  ]) {
    it(`rejects a missing token after ${modifier}`, () => {
      assert.ok(findMissingTokens(`${modifier}:bg-missing`, new Set()).length)
    })
  }
  it("does not exempt all size/ring/outline candidates", () => {
    for (const candidate of [
      "size-missing",
      "focus-visible:ring-misspelled",
      "outline-misspelled",
    ]) {
      assert.ok(findMissingTokens(candidate, new Set()).length)
    }
  })
  it("uses the compiler-supported border-width namespace", async () => {
    for (const namespace of ["border", "border-width"]) {
      const compiler = await compile(
        `@theme static { --${namespace}-widget: 2px; } @tailwind utilities;`
      )
      assert.equal(
        compiler.build(["border-widget"]).includes(".border-widget"),
        namespace === "border-width"
      )
      assert.equal(
        findMissingTokens("border-widget", new Set([`--${namespace}-widget`]))
          .length === 0,
        namespace === "border-width"
      )
    }
  })
})

describe("independent expressions and fallbacks", () => {
  const known = new Set(["--color-known"])
  for (const candidate of [
    "bg-[color-mix(in_srgb,var(--color-known),var(--color-missing))]",
    "shadow-[0_1px_var(--color-known),0_2px_var(--color-missing)]",
    "w-[calc(var(--color-known)+var(--color-missing))]",
  ]) {
    it(`rejects the missing reference in ${candidate}`, () =>
      assert.deepEqual(findMissingTokens(candidate, known), [
        "--color-missing",
      ]))
  }
  it("permits literal, nested and unused fallbacks", () => {
    for (const value of [
      "var(--missing,red)",
      "var(--missing,var(--other,red))",
      "var(--color-known,var(--missing))",
      "var(--available-height)",
    ]) {
      assert.deepEqual(findMissingTokens(`bg-[${value}]`, known), [], value)
    }
    assert.deepEqual(
      findMissingTokens("bg-[var(--missing,var(--other))]", known),
      ["--other"]
    )
  })
})

it("does not treat quoted fallback content as a required variable", () => {
  assert.deepEqual(
    findMissingTokens(
      `content-[var(--optional,'var(--not-a-reference)')]`,
      new Set()
    ),
    []
  )
})

describe("source-to-diagnostic recipe extraction", () => {
  for (const candidate of [
    "focus-visible:ring-misspelled",
    "2xl:bg-missing",
    "group-data-[state=open]:bg-missing",
    "aria-[invalid=true]:bg-missing",
    "has-[input:focus]:bg-missing",
    "size-missing",
  ]) {
    for (const config of [
      (value) => `base: ${value}`,
      (value) => `slots: { root: ${value} }`,
      (value) => `variants: { state: { active: ${value} } }`,
      (value) => `compoundVariants: [{ state: 'active', className: ${value} }]`,
    ]) {
      it(`reports scalar ${candidate} in ${config("VALUE")}`, () => {
        const source = `const styles = tv({ ${config(JSON.stringify(candidate))} })`
        const errors = collectFileErrors(source, new Set(), new Set())
        assert.equal(errors.length, 1)
        assert.equal(errors[0].className, candidate)
        assert.equal(errors[0].line, 1)
        assert.ok(errors[0].expectedTokens.length)
        assert.deepEqual(
          collectFileErrors(
            source,
            new Set([
              "--color-missing",
              "--color-misspelled",
              "--spacing-missing",
            ])
          ),
          []
        )
      })
    }
  }
  it("extracts nested scalar/array recipes, conditions and local class constants", () => {
    const source = `
      const known = "bg-known";
      const styles = tv({ base: [known, "flex"], slots: { icon: "text-icon" },
        variants: { size: { sm: "size-small", lg: ["size-large"] } },
        defaultVariants: { size: "not-a-class" },
        compoundVariants: [{ size: "also-not-a-class", className: "ring-known" }] });
      const choices = { selected: "bg-selected", normal: "bg-normal" };
      const App = () => <div className={cn(choices[state], active ? "hover:bg-active" : "bg-inactive", { "text-error": invalid })} />;
    `
    const classes = extractTailwindClasses(source)
    for (const value of [
      "bg-known",
      "flex",
      "text-icon",
      "size-small",
      "size-large",
      "ring-known",
      "bg-selected",
      "bg-normal",
      "hover:bg-active",
      "bg-inactive",
      "text-error",
    ]) {
      assert.ok(classes.includes(value), value)
    }
    assert.ok(!classes.includes("not-a-class"))
    assert.ok(!classes.includes("also-not-a-class"))
  })
  it("does not diagnose examples in comments, documentation or type declarations", () => {
    const source = `
      // tv({base: "bg-missing"})
      /* <div className="text-missing" /> */
      const docs = 'tv({base: "ring-missing"})';
      const description = "Use bg-missing for examples";
      type Example = { className: "bg-missing" };
      const styles = tv({base: "bg-known"});
    `
    assert.deepEqual(extractTailwindClasses(source), ["bg-known"])
    assert.deepEqual(collectFileErrors(source, new Set(["--color-known"])), [])
  })
})
