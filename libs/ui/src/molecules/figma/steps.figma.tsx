import figma from "@figma/code-connect"
import { Steps } from "../steps"

figma.connect(
  Steps,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1153-66",
  {
    imports: ['import { Steps } from "@techsio/ui-kit/molecules/steps"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      orientation: figma.enum("orientation", {
        horizontal: "horizontal",
        vertical: "vertical",
      }),
    },
    example: ({ size, orientation }) => (
      <Steps size={size} orientation={orientation} count={3} defaultStep={0}>
        <Steps.List>
          <Steps.Item index={0}>
            <Steps.Trigger>Step 1</Steps.Trigger>
          </Steps.Item>
        </Steps.List>
      </Steps>
    ),
  }
)
