export const formatLocaleCode = (code: string | undefined) =>
  (code ?? "").replace(/([a-z])([A-Z])/g, "$1-$2").replace(/_/g, "-")
