import type { Decorator, Preview } from "@storybook/react"
import { isRecord } from "@techsio/std/object"
import { createElement, useEffect } from "react"

import {
  brandAttr,
  brandKeys,
  brandSupportsDark,
  DEFAULT_BRAND,
  DEFAULT_MODE,
  getBrand,
  isBrandKey,
} from "../src/theme/theme-config"
import type { ModeSetting } from "../src/theme/theme-config"

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
const isModeSetting = (value: unknown): value is ModeSetting =>
  value === "light" || value === "dark" || value === "system"

const useWithTheme: Decorator = (Story, context) => {
  const globals: unknown = context.globals
  const { brand: brandValue, mode: modeValue } = isRecord(globals)
    ? globals
    : {}
  const brand =
    typeof brandValue === "string" && isBrandKey(brandValue)
      ? brandValue
      : DEFAULT_BRAND
  const modeSetting = isModeSetting(modeValue) ? modeValue : DEFAULT_MODE

  useEffect(() => {
    const root = document.documentElement
    const mode = brandSupportsDark(brand) ? modeSetting : "light"

    root.classList.remove("light", "dark")
    if (mode === "light" || mode === "dark") {
      root.classList.add(mode)
    }

    const attr = brandAttr(brand)
    if (typeof attr === "string" && attr.length > 0) {
      Object.assign(root.dataset, { theme: attr })
    } else {
      Reflect.deleteProperty(root.dataset, "theme")
    }
  }, [brand, modeSetting])

  return createElement(Story)
}

const preview: Preview = {
  decorators: [useWithTheme],
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
        rules: [{ enabled: true, id: "color-contrast-enhanced" }],
      },
      test: "error",
    },
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(?<property>background|color)$/iu,
        date: /Date$/u,
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
