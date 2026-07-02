import figma from "@figma/code-connect"
import { ActionIcon } from "./action-icon"

figma.connect(
  ActionIcon,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=2668-36",
  {
    imports: ['import { ActionIcon } from "@techsio/ui-kit/atoms/action-icon"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      tone: figma.enum("tone", {
        neutral: "neutral",
        danger: "danger",
      }),
    },
    // The Figma component exposes a swappable icon; the example shows a
    // representative usage. `aria-label` is required (icon-only button).
    example: ({ size, tone }) => (
      <ActionIcon
        aria-label="Clear"
        icon="token-icon-close"
        size={size}
        tone={tone}
      />
    ),
  }
)
