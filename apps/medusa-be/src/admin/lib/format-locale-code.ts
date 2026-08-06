export const formatLocaleCode = (code: string | undefined) =>
  (code ?? "")
    .replaceAll(/(?<lower>[a-z])(?<upper>[A-Z])/gu, "$<lower>-$<upper>")
    .replaceAll("_", "-")
