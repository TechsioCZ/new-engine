import figma from "@figma/code-connect"

import { Menu } from "./menu"

figma.connect(
  Menu,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1183-26",
  {
    example: ({ size }) => (
      <Menu
        items={[{ label: "Item 1", type: "action", value: "item-1" }]}
        size={size}
        triggerText="Open"
      />
    ),
    imports: ['import { Menu } from "@libs/ui/molecules/menu"'],
    props: {
      size: figma.enum("size", {
        lg: "lg",
        md: "md",
        sm: "sm",
      }),
    },
  },
)
