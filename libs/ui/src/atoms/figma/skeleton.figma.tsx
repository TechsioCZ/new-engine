import figma from "@figma/code-connect"
import { Skeleton } from "../skeleton"

figma.connect(
  Skeleton.Rectangle,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=565-101",
  {
    imports: ['import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"'],
    props: {
      variant: figma.enum("variant", {
        primary: "primary",
        secondary: "secondary",
      }),
      speed: figma.enum("speed", {
        slow: "slow",
        normal: "normal",
        fast: "fast",
      }),
    },
    example: ({ speed, variant }) => (
      <Skeleton.Rectangle speed={speed} variant={variant}>
        <div className="h-20 w-xs rounded-md bg-primary" />
      </Skeleton.Rectangle>
    ),
  },
)

figma.connect(
  Skeleton.Circle,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=565-198",
  {
    imports: ['import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"'],
    props: {
      variant: figma.enum("variant", {
        primary: "primary",
        secondary: "secondary",
      }),
      speed: figma.enum("speed", {
        slow: "slow",
        normal: "normal",
        fast: "fast",
      }),
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
        xl: "xl",
      }),
    },
    example: ({ size, speed, variant }) => (
      <Skeleton.Circle size={size} speed={speed} variant={variant}>
        <div className="bg-primary/20 size-16 rounded-full" />
      </Skeleton.Circle>
    ),
  },
)

figma.connect(
  Skeleton.Text,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=565-2143",
  {
    imports: ['import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"'],
    props: {
      variant: figma.enum("variant", {
        primary: "primary",
        secondary: "secondary",
      }),
      speed: figma.enum("speed", {
        slow: "slow",
        normal: "normal",
        fast: "fast",
      }),
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
        xl: "xl",
      }),
      noOfLines: figma.enum("noOfLines", {
        "1": 1,
        "3": 3,
        "5": 5,
      }),
      lastLineWidth: figma.enum("lastLineWidth", {
        "60%": "60%",
        "80%": "80%",
        "90%": "90%",
      }),
    },
    example: ({ lastLineWidth, noOfLines, size, speed, variant }) => (
      <Skeleton.Text
        lastLineWidth={lastLineWidth}
        noOfLines={noOfLines}
        size={size}
        speed={speed}
        variant={variant}
      >
        <div className="space-y-150 w-xs">
          <div className="bg-primary/20 h-4 rounded-sm w-full" />
          <div className="bg-primary/20 h-4 rounded-sm w-4/5" />
        </div>
      </Skeleton.Text>
    ),
  },
)
