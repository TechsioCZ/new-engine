import figma from "@figma/code-connect"

import { Accordion } from "./accordion"

figma.connect(
  Accordion,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=993-936",
  {
    example: ({ size, variant, shadow }) => (
      <Accordion shadow={shadow} size={size} variant={variant}>
        <Accordion.Item value="item-1">
          <Accordion.Header>Title</Accordion.Header>
          <Accordion.Content>Content</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    ),
    imports: ['import { Accordion } from "@libs/ui/molecules/accordion"'],
    props: {
      shadow: figma.enum("shadow", {
        none: "none",
        sm: "sm",
        md: "md",
      }),
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      variant: figma.enum("variant", {
        default: "default",
        borderless: "borderless",
        child: "child",
      }),
    },
  }
)
