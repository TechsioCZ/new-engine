import { getI18n } from "react-i18next"

export const translateBreadcrumb = (key: string, fallback: string) => {
  try {
    const i18n = getI18n()

    if (!i18n?.isInitialized) {
      return fallback
    }

    const translated = i18n.t(key, { defaultValue: fallback })

    return typeof translated === "string" ? translated : fallback
  } catch {
    return fallback
  }
}
