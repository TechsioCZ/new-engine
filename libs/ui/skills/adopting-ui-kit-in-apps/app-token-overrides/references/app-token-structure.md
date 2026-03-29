# App Token Structure

Mirror the library token structure in the app layer by default.

## Default Layout

```text
tokens/
  _app-semantic.css
  _app-typography.css
  _app-spacing.css
  components/
    atoms/
      _app-button.css
      _app-input.css
    molecules/
      _app-dialog.css
    organisms/
      _app-header.css
    templates/
      _app-product-grid.css
```

## Naming

- Keep the app prefix consistent with the app's local convention.
- If the project uses `_akros-*` or another app slug, keep using that slug consistently.
- Preserve the same component grouping that `libs/ui/src/tokens` uses.

## Practical Rule

Create only the files the app actually needs.

- If semantic remapping is enough, stop there.
- If typography or spacing remapping is enough, stop there.
- Add component files only for real component-specific divergences.

## What To Mirror

Mirror structure and responsibility, not the full token contents.

- Keep semantic concerns in semantic files.
- Keep typography concerns in typography files.
- Keep spacing concerns in spacing files.
- Keep component-specific changes in component-specific files.

Do not copy the whole library token file into the app just to override one or two values.
