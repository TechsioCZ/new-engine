import figma from "@figma/code-connect"
import { Menu } from "./menu"

figma.connect(
  Menu,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1183-26",
  {
    imports: ['import { Menu } from "@libs/ui/molecules/menu"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
    },
    example: ({ size }) => (
      <Menu
        items={[{ type: "action", value: "item-1", label: "Item 1" }]}
        size={size}
        triggerText="Open"
      />
    ),
  }
)
