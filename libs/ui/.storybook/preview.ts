import type { Decorator, Preview } from "@storybook/react"
import { createElement, useEffect } from "react"
import { brandKeys, DEFAULT_BRAND, getBrand } from "../src/theme/theme-config"
import {
  type UIAppearance,
  UIProvider,
  type UISize,
} from "../src/theme/ui-provider"
import "../src/tokens/index.css"
import { curateControls } from "./controls"
import { DocsTheme } from "./docs-theme"
import { applyPreviewTheme } from "./theme.mjs"
import { COMPONENT_DEFAULT } from "./ui-defaults-panel"

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

/*
 * Size / Appearance toolbars wrap the story in a UIProvider so a reviewer can
 * see every component follow the global defaults. "Component default" renders
 * without a provider, which keeps stories and visual baselines unchanged.
 */
const withUIDefaults: Decorator = (Story, context) => {
  const { uiSize, uiAppearance } = context.globals
  if (uiSize === COMPONENT_DEFAULT && uiAppearance === COMPONENT_DEFAULT) {
    return createElement(Story)
  }
  return createElement(
    UIProvider,
    {
      size: uiSize === COMPONENT_DEFAULT ? undefined : (uiSize as UISize),
      appearance:
        uiAppearance === COMPONENT_DEFAULT
          ? undefined
          : (uiAppearance as UIAppearance),
    },
    createElement(Story)
  )
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
    uiSize: {
      description: "Global component size (UIProvider)",
      toolbar: {
        title: "Size",
        icon: "ruler",
        items: [
          { value: COMPONENT_DEFAULT, title: "Component default" },
          { value: "sm", title: "Small (sm)" },
          { value: "md", title: "Medium (md)" },
          { value: "lg", title: "Large (lg)" },
        ],
        dynamicTitle: true,
      },
    },
    uiAppearance: {
      description: "Global component appearance (UIProvider)",
      toolbar: {
        title: "Appearance",
        icon: "contrast",
        items: [
          { value: COMPONENT_DEFAULT, title: "Component default" },
          { value: "solid", title: "Solid" },
          { value: "subtle", title: "Subtle" },
          { value: "outline", title: "Outline" },
          { value: "ghost", title: "Ghost" },
          { value: "plain", title: "Plain" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    brand: DEFAULT_BRAND,
    mode: "light",
    uiSize: COMPONENT_DEFAULT,
    uiAppearance: COMPONENT_DEFAULT,
  },
  argTypesEnhancers: [curateControls],
  decorators: [withUIDefaults, withTheme],
}

export default preview
