# Zag.js Doc Map

Use local Zag.js repo documentation from:

`C:\Users\pisez\.local\share\zagjs\zag`

Prefer this order:

1. Component docs (`website/data/components/*.mdx`)
2. React snippets (`website/data/snippets/react/<machine>/*.mdx`)
3. Machine source (`packages/machines/<machine>/src/*.ts`)

## Direct Paths for Current UI Patterns

### Accordion

1. `C:\Users\pisez\.local\share\zagjs\zag\website\data\components\accordion.mdx`
2. `C:\Users\pisez\.local\share\zagjs\zag\website\data\snippets\react\accordion\usage.mdx`
3. `C:\Users\pisez\.local\share\zagjs\zag\packages\machines\accordion\src\accordion.machine.ts`
4. `C:\Users\pisez\.local\share\zagjs\zag\packages\machines\accordion\src\accordion.connect.ts`

### Carousel

1. `C:\Users\pisez\.local\share\zagjs\zag\website\data\components\carousel.mdx`
2. `C:\Users\pisez\.local\share\zagjs\zag\website\data\snippets\react\carousel\usage.mdx`
3. `C:\Users\pisez\.local\share\zagjs\zag\packages\machines\carousel\src\carousel.machine.ts`
4. `C:\Users\pisez\.local\share\zagjs\zag\packages\machines\carousel\src\carousel.connect.ts`

### Combobox

1. `C:\Users\pisez\.local\share\zagjs\zag\website\data\components\combobox.mdx`
2. `C:\Users\pisez\.local\share\zagjs\zag\website\data\snippets\react\combobox\usage.mdx`
3. `C:\Users\pisez\.local\share\zagjs\zag\packages\machines\combobox\src\combobox.machine.ts`
4. `C:\Users\pisez\.local\share\zagjs\zag\packages\machines\combobox\src\combobox.connect.ts`
5. `C:\Users\pisez\.local\share\zagjs\zag\packages\machines\combobox\src\combobox.collection.ts`

### Tree View

1. `C:\Users\pisez\.local\share\zagjs\zag\website\data\components\tree-view.mdx`
2. `C:\Users\pisez\.local\share\zagjs\zag\website\data\snippets\react\tree-view\usage.mdx`
3. `C:\Users\pisez\.local\share\zagjs\zag\packages\machines\tree-view\src\tree-view.machine.ts`
4. `C:\Users\pisez\.local\share\zagjs\zag\packages\machines\tree-view\src\tree-view.connect.ts`
5. `C:\Users\pisez\.local\share\zagjs\zag\packages\machines\tree-view\src\tree-view.collection.ts`

## Generic Lookup Pattern for Any Zag Machine

For machine `<name>`:

1. `C:\Users\pisez\.local\share\zagjs\zag\website\data\components\<name>.mdx`
2. `C:\Users\pisez\.local\share\zagjs\zag\website\data\snippets\react\<name>\usage.mdx`
3. `C:\Users\pisez\.local\share\zagjs\zag\packages\machines\<name>\src\<name>.machine.ts`
4. `C:\Users\pisez\.local\share\zagjs\zag\packages\machines\<name>\src\<name>.connect.ts`

## Useful Search Commands

```powershell
rg -n "## |### |data-part|data-state|machine|connect|on.*Change" C:\Users\pisez\.local\share\zagjs\zag\website\data\components\<name>.mdx
rg -n "get.*Props|data-part|data-state" C:\Users\pisez\.local\share\zagjs\zag\packages\machines\<name>\src
```

## Tailwind Theme Reference

When deciding token-backed class names or CSS variable usage, use:

`https://tailwindcss.com/docs/theme`
