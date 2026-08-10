import figma from "@figma/code-connect"

import { Steps } from "./steps"

figma.connect(
  Steps,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1153-66",
  {
    example: ({ size, orientation }) => (
      <Steps count={3} defaultStep={0} orientation={orientation} size={size}>
        <Steps.List>
          <Steps.Item index={0}>
            <Steps.Trigger>Step 1</Steps.Trigger>
          </Steps.Item>
        </Steps.List>
      </Steps>
    ),
    imports: ['import { Steps } from "@libs/ui/molecules/steps"'],
    props: {
      orientation: figma.enum("orientation", {
        horizontal: "horizontal",
        vertical: "vertical",
      }),
      size: figma.enum("size", {
        lg: "lg",
        md: "md",
        sm: "sm",
      }),
    },
  },
)
