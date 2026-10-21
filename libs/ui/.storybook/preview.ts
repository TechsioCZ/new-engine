import type { Decorator, Preview } from "@storybook/react"
import { createElement, useEffect } from "react"
import { brandKeys, getBrand } from "../src/theme/theme-config"
import "../src/tokens/index.css"
import { curateControls } from "./controls"
import { DocsTheme } from "./docs-theme"
import { applyPreviewTheme } from "./theme.mjs"

const brandItems = brandKeys().map((key) => ({
  value: key,
  title: getBrand(key).label,
}))

/*
 * Applies the two theme axes to <html>, mirroring the app:
 *   - mode  → `.light` / `.dark` class (drives color-scheme; "system" = no class)
 *   - brand → `data-theme="<attr>"` (base brand sets no attribute)
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
    brand: "base",
    mode: "light",
  },
  argTypesEnhancers: [curateControls],
  decorators: [withTheme],
}

export default preview
