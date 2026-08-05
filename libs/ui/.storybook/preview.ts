import type { Decorator, Preview } from "@storybook/react"
import { createElement, useEffect } from "react"

import {
  brandAttr,
  brandKeys,
  brandSupportsDark,
  getBrand,
} from "../src/theme/theme-config"
import type { BrandKey, ModeSetting } from "../src/theme/theme-config"

import "../src/tokens/index.css"

const brandItems = brandKeys().map((key) => ({
  title: getBrand(key).label,
  value: key,
}))

const modeItems: { value: ModeSetting; title: string }[] = [
  { title: "Light", value: "light" },
  { title: "Dark", value: "dark" },
  { title: "System", value: "system" },
]

/*
 * Applies the two theme axes to <html>, mirroring the app:
 *   - mode  → `.light` / `.dark` class (drives color-scheme; "system" = no class)
 *   - brand → `data-theme="<attr>"` (base brand sets no attribute)
 * Light-only brands are forced to light regardless of the Mode toolbar.
 */
const withTheme: Decorator = (Story, context) => {
  const brand = context.globals.brand as BrandKey
  const modeSetting = context.globals.mode as ModeSetting

  useEffect(() => {
    const root = document.documentElement
    const mode = brandSupportsDark(brand) ? modeSetting : "light"

    root.classList.remove("light", "dark")
    if (mode === "light" || mode === "dark") {
      root.classList.add(mode)
    }

    const attr = brandAttr(brand)
    if (attr) {
      root.dataset.theme = attr
    } else {
      delete root.dataset.theme
    }
  }, [brand, modeSetting])

  return createElement(Story)
}

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    brand: {
      description: "Brand theme",
      toolbar: {
        dynamicTitle: true,
        icon: "paintbrush",
        items: brandItems,
        title: "Brand",
      },
    },
    mode: {
      description: "Color mode",
      toolbar: {
        dynamicTitle: true,
        icon: "circlehollow",
        items: modeItems,
        title: "Mode",
      },
    },
  },
  initialGlobals: {
    brand: "base",
    mode: "light",
  },
  parameters: {
    a11y: {
      apca: {
        level: "gold",
        useCase: "body",
      },
      config: {
        rules: [{ id: "color-contrast-enhanced", enabled: true }],
      },
      test: "error",
    },
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: [
          "Atoms",
          "Molecules",
          "Organisms",
          "Templates",
          "Pages",
          "Overview",
          "*",
        ],
      },
    },
  },
}

export default preview
