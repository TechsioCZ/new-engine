/** biome-ignore-all lint/suspicious/noMisplacedAssertion: Runtime validators and awaited node:test helpers intentionally assert outside test callbacks. */
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { rmSync } from "node:fs"
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import tailwind from "@tailwindcss/postcss"
import postcss from "postcss"
import ts from "typescript"

const uiRoot = path.resolve(import.meta.dirname, "..")
const commands = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  return result.stdout
}

// biome-ignore lint/style/noDoneCallback: Node test supplies a TestContext, not a done callback.
test("packed CSS exports generate utilities and preserve public callback contracts", async (context) => {
  const root = await mkdtemp(
    path.join(process.env.OWNED_TEMP_DIR ?? os.tmpdir(), "ui-consumer-")
  )
  const cleanup = () => rmSync(root, { recursive: true, force: true })
  const interrupt = () => {
    cleanup()
    process.exit(1)
  }
  process.once("exit", cleanup)
  process.once("SIGINT", interrupt)
  process.once("SIGTERM", interrupt)
  context.after(async () => {
    process.off("exit", cleanup)
    process.off("SIGINT", interrupt)
    process.off("SIGTERM", interrupt)
    await rm(root, { recursive: true, force: true })
  })
  const packageDir = path.join(root, "node_modules/@techsio/ui-kit")
  await mkdir(packageDir, { recursive: true })
  const output = JSON.parse(
    commands(
      "npm",
      ["pack", "--ignore-scripts", "--json", "--pack-destination", root],
      uiRoot
    )
  )
  commands(
    "tar",
    [
      "-xzf",
      path.join(root, output[0].filename),
      "--strip-components=1",
      "-C",
      packageDir,
    ],
    root
  )
  // Resolve build plugins from the real toolchain, while the package and all
  // candidate discovery live outside the workspace and under node_modules.
  const installed = JSON.parse(
    await readFile(path.join(packageDir, "package.json"), "utf8")
  )
  for (const name of new Set([
    ...Object.keys(installed.dependencies),
    "tailwindcss",
    "react",
    "react-dom",
    "@types/react",
    "@types/react-dom",
  ])) {
    await mkdir(path.dirname(path.join(root, "node_modules", name)), {
      recursive: true,
    })
    await symlink(
      await realpath(path.join(uiRoot, "node_modules", name)),
      path.join(root, "node_modules", name),
      "dir"
    )
  }
  await writeFile(
    path.join(root, "app.tsx"),
    'import { Button } from "@techsio/ui-kit/atoms/button"; export const App = () => <Button isLoading>Continue to checkout</Button>'
  )
  const markup = commands(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import { createElement } from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { Button } from '@techsio/ui-kit/atoms/button';
    console.log(renderToStaticMarkup(createElement(Button, {isLoading: true}, 'Continue to checkout')));
  `,
    ],
    root
  )
  assert.match(markup, /Continue to checkout/)
  assert.match(markup, /button-size-md/)
  assert.match(markup, /token-icon-button-spinner/)
  for (const entry of ["tokens", "tokens-with-tailwind"]) {
    const css = `${entry === "tokens" ? '@import "tailwindcss" source(none);\n' : ""}@import "@techsio/ui-kit/${entry}";\n@source "./app.tsx";`
    const from = path.join(root, `${entry}.css`)
    await writeFile(from, css)
    const result = await postcss([
      tailwind({ base: root, optimize: false }),
    ]).process(css, { from })
    for (const utility of [
      ".bg-button-bg-primary-base",
      ".button-size-md",
      ".text-button-md",
      ".token-icon-button-spinner",
    ]) {
      assert.ok(result.css.includes(utility), `${entry} omitted ${utility}`)
    }
    const sizeDeclarations = new Map()
    result.root.walkRules(".button-size-md", (rule) => {
      rule.walkDecls((declaration) => {
        sizeDeclarations.set(declaration.prop, declaration.value)
      })
    })
    assert.equal(sizeDeclarations.get("height"), "auto")
    assert.equal(
      sizeDeclarations.get("min-height"),
      "var(--height-form-control-md)"
    )
    assert.match(result.css, /:focus-visible/)
    assert.match(result.css, /:disabled|data-disabled/)
    assert.ok(installed.exports["./atoms/*"])
  }
  // Compile consumers against installed declarations, not monorepo source paths.
  const contractPath = path.join(root, "callbacks.ts")
  const contracts = `
    import type { ComponentProps } from 'react';
    import type { FormInput } from '@techsio/ui-kit/molecules/form-input';
    import type { FormCheckbox } from '@techsio/ui-kit/molecules/form-checkbox';
    import type { Select } from '@techsio/ui-kit/molecules/select';
    import type { RadioGroup } from '@techsio/ui-kit/molecules/radio-group';
    import type { Tabs } from '@techsio/ui-kit/molecules/tabs';
    import type { Combobox } from '@techsio/ui-kit/molecules/combobox';
    import type { Slider } from '@techsio/ui-kit/molecules/slider';
    import type { Rating } from '@techsio/ui-kit/atoms/rating';
    import type { NumericInput } from '@techsio/ui-kit/atoms/numeric-input';
    import type { Popover } from '@techsio/ui-kit/molecules/popover';
    const passwordHelp: ComponentProps<typeof FormInput> = {label: 'Password', type: 'password', helpText: 'Password must contain 12 characters.'};
    const newsletterHelp: ComponentProps<typeof FormCheckbox> = {label: 'Send me product updates', name: 'newsletter', helpText: 'You can unsubscribe anytime.'};
    type Equal<A,B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
    type Expect<T extends true> = T;
    type Payload<T,K extends keyof T> = T[K] extends ((...args: infer A) => unknown) | undefined ? A[0] : never;
    type Contracts = [
      Expect<Equal<Payload<ComponentProps<typeof Select>, 'onValueChange'>['value'], string[]>>,
      Expect<Equal<Payload<ComponentProps<typeof RadioGroup>, 'onValueChange'>, string | null>>,
      Expect<Equal<Payload<ComponentProps<typeof Tabs>, 'onValueChange'>, string>>,
      Expect<Equal<Payload<ComponentProps<typeof Combobox>, 'onChange'>, string[]>>,
      Expect<Equal<Payload<ComponentProps<typeof Combobox>, 'onOpenChange'>, boolean>>,
      Expect<Equal<Payload<ComponentProps<typeof Slider>, 'onChange'>, number[]>>,
      Expect<Equal<Payload<ComponentProps<typeof Rating>, 'onChange'>, number>>,
      Expect<Equal<Payload<ComponentProps<typeof NumericInput>, 'onChange'>, number>>,
      Expect<Equal<Payload<ComponentProps<typeof NumericInput>, 'onValueChange'>['value'], string>>,
      Expect<Equal<Payload<ComponentProps<typeof Popover>, 'onOpenChange'>['open'], boolean>>
    ];
    // @ts-expect-error Existing details callbacks must not silently become boolean setters.
    const incompatible: NonNullable<ComponentProps<typeof Popover>['onOpenChange']> = (open: boolean) => {};
  `
  const compile = () =>
    ts.getPreEmitDiagnostics(
      ts.createProgram([contractPath], {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ES2022,
        types: ["react"],
        typeRoots: [path.join(root, "node_modules/@types")],
      })
    )
  await writeFile(contractPath, contracts)
  assert.deepEqual(
    compile().map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
    ),
    []
  )
  await writeFile(
    contractPath,
    `${contracts}\n// @ts-expect-error negative compiler control\nconst valid = 1;\ntype Broken = Expect<Equal<string, number>>;`
  )
  const negative = compile().map((diagnostic) => diagnostic.code)
  assert.ok(
    negative.includes(2578),
    "Unused @ts-expect-error must fail the consumer compiler"
  )
  assert.ok(
    negative.includes(2344),
    "A false callback type assertion must fail the consumer compiler"
  )
})
