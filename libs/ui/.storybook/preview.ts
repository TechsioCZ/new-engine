import type { Decorator, Preview } from "@storybook/react"
import { createElement, useEffect } from "react"
import {
  type BrandKey,
  brandAttr,
  brandKeys,
  brandSupportsDark,
  getBrand,
  type ModeSetting,
} from "../src/theme/theme-config"
import "../src/tokens/index.css"

const brandItems = brandKeys().map((key) => ({
  value: key,
  title: getBrand(key).label,
}))

const modeItems: { value: ModeSetting; title: string }[] = [
  { value: "light", title: "Light" },
  { value: "dark", title: "Dark" },
  { value: "system", title: "System" },
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
      root.setAttribute("data-theme", attr)
    } else {
      root.removeAttribute("data-theme")
    }
  }, [brand, modeSetting])

  return createElement(Story)
}

const preview: Preview = {
  parameters: {
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
    a11y: {
      config: {
        rules: [{ id: "color-contrast-enhanced", enabled: true }],
      },
      apca: {
        level: "gold",
        useCase: "body",
      },
      test: "error",
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
    mode: {
      description: "Color mode",
      toolbar: {
        title: "Mode",
        icon: "circlehollow",
        items: modeItems,
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    brand: "base",
    mode: "light",
  },
  decorators: [withTheme],
}

export default preview
