import figma from "@figma/code-connect"

import { Skeleton } from "./skeleton"

const placeholderBgClassByVariant = {
  primary: "bg-skeleton-bg-primary",
  secondary: "bg-skeleton-bg-secondary",
} as const

figma.connect(
  Skeleton.Rectangle,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=565-101",
  {
    example: ({ speed, variant }) => {
      const placeholderBgClass = placeholderBgClassByVariant[variant]

      return (
        <Skeleton.Rectangle speed={speed} variant={variant}>
          <div className={`h-20 w-xs rounded-md ${placeholderBgClass}`} />
        </Skeleton.Rectangle>
      )
    },
    imports: ['import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"'],
    props: {
      speed: figma.enum("speed", {
        slow: "slow",
        normal: "normal",
        fast: "fast",
      }),
      variant: figma.enum("variant", {
        primary: "primary",
        secondary: "secondary",
      }),
    },
  },
)

figma.connect(
  Skeleton.Circle,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=565-198",
  {
    example: ({ size, speed, variant }) => {
      const placeholderBgClass = placeholderBgClassByVariant[variant]

      return (
        <Skeleton.Circle size={size} speed={speed} variant={variant}>
          <div className={`size-16 rounded-full ${placeholderBgClass}`} />
        </Skeleton.Circle>
      )
    },
    imports: ['import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
        xl: "xl",
      }),
      speed: figma.enum("speed", {
        slow: "slow",
        normal: "normal",
        fast: "fast",
      }),
      variant: figma.enum("variant", {
        primary: "primary",
        secondary: "secondary",
      }),
    },
  },
)

figma.connect(
  Skeleton.Text,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=565-2143",
  {
    example: ({ lastLineWidth, noOfLines, size, speed, variant }) => {
      const placeholderBgClass = placeholderBgClassByVariant[variant]

      return (
        <Skeleton.Text
          lastLineWidth={lastLineWidth}
          noOfLines={noOfLines}
          size={size}
          speed={speed}
          variant={variant}
        >
          <div className="w-xs space-y-150">
            <div className={`h-4 w-full rounded-sm ${placeholderBgClass}`} />
            <div className={`h-4 w-4/5 rounded-sm ${placeholderBgClass}`} />
          </div>
        </Skeleton.Text>
      )
    },
    imports: ['import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"'],
    props: {
      lastLineWidth: figma.enum("lastLineWidth", {
        "60%": "60%",
        "80%": "80%",
        "90%": "90%",
      }),
      noOfLines: figma.enum("noOfLines", {
        "1": 1,
        "3": 3,
        "5": 5,
      }),
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
        xl: "xl",
      }),
      speed: figma.enum("speed", {
        slow: "slow",
        normal: "normal",
        fast: "fast",
      }),
      variant: figma.enum("variant", {
        primary: "primary",
        secondary: "secondary",
      }),
    },
  },
)
