export const withRequestLocale = <TInput extends { locale?: string }>(
  input: TInput,
  locale: string
): TInput => ({
  ...input,
  locale: input.locale ?? locale,
})
