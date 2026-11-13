# unified-style-props codemod

Migrates `@techsio/ui-kit` consumers to the unified style props:
`appearance` (fill style), `severity` (color), `validateStatus` (validation)
and `size` (size scale only).

```sh
node libs/ui/codemods/unified-style-props/index.mjs <path> [more paths…] [--dry]
```

It parses `.ts` / `.tsx` / `.jsx` files with the TypeScript compiler, touches
only JSX elements imported from `@techsio/ui-kit/...` (or the library's own
`src/` and relative paths), and edits text in place, so formatting and comments
survive. Run your formatter and type checker afterwards.

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
| any object literal | `theme: "outlined"` (Button themes) | `appearance: "outline"` |
| TotalsSummary rows | `emphasis: "default"` | `severity: "neutral"` |

String literals inside expressions are mapped too
(`theme={on ? "solid" : "outlined"}` → `appearance={on ? "solid" : "outline"}`).

## What it reports instead

- A computed value it cannot map (`<Badge variant={status} />`) is renamed and
  listed under `review:` — check that the variable now holds the new values.
- Wrapper components, spread props, Storybook `args` / `argTypes` and data
  objects with a `variant` key are not rewritten; the type checker lists them.

`markdown.mjs` exports `transformMarkdown` for `tsx` / `jsx` code blocks in
documentation.
