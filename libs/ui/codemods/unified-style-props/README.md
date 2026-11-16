# unified-style-props codemod

Migrates `@techsio/ui-kit` consumers to the unified style props:
`appearance` (fill style), `severity` (color), `validateStatus` (validation)
and `size` (size scale only).

The codemod is not published with the package. Run it from a new-engine
checkout (it uses that checkout's `typescript`) against the consumer's sources:

```sh
node <new-engine>/libs/ui/codemods/unified-style-props/index.mjs <app>/src [more paths…] [--dry]
# the kit's own stories and tests import the kit through relative paths:
node libs/ui/codemods/unified-style-props/index.mjs libs/ui/stories libs/ui/tests --kit-src libs/ui/src
```

It parses `.ts` / `.tsx` / `.jsx` files with the TypeScript compiler and edits
text in place, so formatting and comments survive. Only JSX elements imported
from `@techsio/ui-kit/...` count as the kit — plus relative imports that
resolve into a `--kit-src` directory. A project's own `./atoms/button` is never
taken for the kit. Run your formatter and type checker afterwards.

## What it rewrites

| Component | Before | After |
|---|---|---|
| Button, LinkButton, any `*.Trigger` / `*Button` / `*.Remove` part | `variant="danger"` | `severity="danger"` |
| | `theme="solid"` / `"light"` / `"outlined"` / `"borderless"` | `appearance="solid"` / `"subtle"` / `"outline"` / `"ghost"` |
| | `theme="unstyled"` | `unstyled` |
| Badge | `variant="info"` … | `severity="info"` … |
| | `variant="outline"` | `appearance="outline" severity="neutral"` |
| | `variant="dynamic"` | `severity="custom"` |
| Skeleton (all parts) | `variant` | `severity` |
| Icon | `color` | `severity` |
| ActionIcon, Sidebar.CloseTrigger | `tone` | `severity` |
| VerticalNavigation.Group / BranchContent | `tone="accent"` · `variant="secondary"` | `appearance="solid"` · `severity="secondary"` |
| Pagination | `variant="filled"` / `"outlined"` / `"minimal"` | `appearance="solid"` / `"outline"` / `"ghost"` |
| Tabs (+ TabsTemplate) | `variant="default"` | `appearance="underline"` |
| Tooltip | `variant="default"` | `appearance="solid"` |
| Accordion (+ template) | `variant="default"` / `"borderless"` / `"child"` | `appearance="outline"` / `"ghost"` / `appearance="ghost" nested` |
| RadioGroup, RadioCard, Steps, Table, DataTable, Breadcrumb | `variant` | `appearance` (same values) |
| Input, FormInput | `variant="error"` | `validateStatus="error"` |
| Textarea, FormTextarea | `variant="error"` / `"borderless"` | `validateStatus="error"` / `appearance="ghost"` |
| Sidebar.Pane | `size="rail"` | `paneSize="rail"` |
| ProductCard.Button | `buttonVariant` | `action` |
| TotalsSummary rows (`{ label, value, … }`, any import alias) | `emphasis: "default"` | `severity: "neutral"` |

String literals an expression can evaluate to are mapped too — ternary
branches, `||` / `??` operands and the right side of `&&`
(`theme={on ? "solid" : "outlined"}` → `appearance={on ? "solid" : "outline"}`).
Literals in conditions and comparisons are left alone
(`kind === "light" ? …` keeps `"light"`).

## What it reports instead

- A computed value it cannot map (`<Badge variant={status} />`) is renamed and
  listed under `review:` — check that the variable now holds the new values.
- A value that needs separate props (Badge `"outline"`, Accordion `"child"`,
  Button `"unstyled"`) inside an expression is left as is and listed.
- A computed TotalsSummary `emphasis` keeps its logic: the key becomes
  `severity`, its literals are mapped (`"default"` → `"neutral"`), and it is
  listed when a value is not a literal.
- Object literals are data the codemod cannot type, so they are never
  rewritten: a `theme: "outlined"` key is listed with its replacement
  (`appearance: "outline"`) for you to apply where it feeds Button props,
  such as DataTable toolbar actions. Stored settings stay untouched.
- An `emphasis` key outside a TotalsSummary row shape is listed, not changed.
- Wrapper components, spread props, Storybook `args` / `argTypes` and data
  objects with a `variant` key are not rewritten; the type checker lists them.

`markdown.mjs` exports `transformMarkdown` for `tsx` / `jsx` code blocks in
documentation.
