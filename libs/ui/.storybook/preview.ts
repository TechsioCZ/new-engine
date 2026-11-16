import type { Decorator, Preview } from "@storybook/react"
import { createElement, useEffect } from "react"
import { configure } from "storybook/test"
import { brandKeys, DEFAULT_BRAND, getBrand } from "../src/theme/theme-config"
import "../src/tokens/index.css"
import { curateControls } from "./controls"
import { DocsTheme } from "./docs-theme"
import { applyPreviewTheme } from "./theme.mjs"

/*
 * Testing-library's async utilities (findByRole, waitFor) inside a play
 * function default to 1 s, while the budgets around them are 60 s (jest) and
 * 120 s / 30 s (Playwright). One second is a wrong budget on a runner that is
 * also serving Storybook, not a signal: these utilities poll, so a query that
 * is ready returns immediately and only a genuinely stuck story spends more.
 */
configure({ asyncUtilTimeout: 10_000 })

const brandItems = brandKeys().map((key) => ({
  value: key,
  title: getBrand(key).label,
}))

/*
 * Applies the two theme axes to <html>, mirroring the app:
 *   - mode  → `.light` / `.dark` class (drives color-scheme; "system" = no class)
 *   - brand → `data-theme="<attr>"`
 * Light-only brands are forced to light regardless of the Mode toolbar.
 */
const withTheme: Decorator = (Story, context) => {
  const { brand, mode } = context.globals
  const { brandLock } = context.parameters
  useEffect(() => {
    applyPreviewTheme(document.documentElement, { brand, mode }, brandLock)
  }, [brand, mode, brandLock])

  return createElement(Story)
}

const preview: Preview = {
  parameters: {
    docs: { container: DocsTheme },
    backgrounds: { disable: true },
    controls: {
      exclude: /^(?:id|ref|.*Ref)$/,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: [
          "Guide",
          ["Getting Started", "*"],
          "Overview",
          "UX",
          [
            "Introduction",
            "Writing",
            "Formatting",
            "States",
            "Feedback and actions",
            "Component selection",
            "Value lifecycle",
            "Accessibility",
          ],
          "Atoms",
          "Molecules",
          "Organisms",
          "Templates",
          "Pages",
          "*",
        ],
      },
    },
    a11y: {
      config: {
        rules: [{ id: "color-contrast-enhanced", enabled: true }],
      },
      apca: {
        level: "gold",
        useCase: "body",
      },
      // Let the reporter record each result before enforcing its violation
      // policy. The standard test command remains strict by default.
      test: "todo",
    },
  },
  globalTypes: {
    brand: {
      description: "Brand theme",
      toolbar: {
        title: "Brand",
        icon: "paintbrush",
        items: brandItems,
        dynamicTitle: true,
      },
    },
    /*
     * Declared without a `toolbar` on purpose. Its control lives in
     * .storybook/manager.tsx, because a static toolbar cannot disable Dark
     * for light-only brands — see the comment there.
     */
    mode: {
      description: "Color mode",
    },
  },
  initialGlobals: {
    brand: DEFAULT_BRAND,
    mode: "light",
  },
  argTypesEnhancers: [curateControls],
  decorators: [withTheme],
}

export default preview
