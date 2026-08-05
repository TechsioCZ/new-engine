export const formatLocaleCode = (code: string | undefined) =>
  (code ?? "").replaceAll(/([a-z])([A-Z])/g, "$1-$2").replaceAll(/_/g, "-")
