export const AKROS_ALLOWED_VARIANTS = {
  button: [
    { theme: "solid", variant: "primary" },
    { theme: "solid", variant: "secondary" },
    { theme: "outlined", variant: "secondary" },
    { theme: "unstyled", variant: "primary", size: "current" },
  ],
  input: [{ size: "md", variant: "default" }, { size: "md", variant: "error" }],
  select: [{ size: "md", validateStatus: "default" }, { size: "md", validateStatus: "error" }],
  numericInput: [{ size: "md" }],
  formCheckbox: [{ size: "md" }],
  header: [{ size: "md" }],
  footer: [{ size: "md" }],
  tabs: [{ variant: "line", size: "sm" }, { variant: "line", size: "md" }],
  steps: [{ orientation: "horizontal" }],
} as const

export type AkrosAllowedVariants = typeof AKROS_ALLOWED_VARIANTS
