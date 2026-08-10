export const resolveInitialVariantId = (
  variants: readonly { id?: string }[] | null | undefined,
  initialVariantId: string | undefined,
): string | null => {
  if (
    initialVariantId !== undefined &&
    variants?.some((variant) => variant.id === initialVariantId) === true
  ) {
    return initialVariantId
  }

  return variants?.[0]?.id ?? null
}
