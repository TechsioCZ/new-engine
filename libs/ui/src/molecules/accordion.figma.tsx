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
        md: "md",
        none: "none",
        sm: "sm",
      }),
      size: figma.enum("size", {
        lg: "lg",
        md: "md",
        sm: "sm",
      }),
      variant: figma.enum("variant", {
        borderless: "borderless",
        child: "child",
        default: "default",
      }),
    },
  },
)
