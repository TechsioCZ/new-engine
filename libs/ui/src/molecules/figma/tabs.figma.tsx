import figma from "@figma/code-connect"
import { Tabs } from "../tabs"

figma.connect(
  Tabs,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1174-74",
  {
    imports: ['import { Tabs } from "@libs/ui/molecules/tabs"'],
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
      <Tabs defaultValue="tab-1" orientation={orientation} size={size}>
        <Tabs.List>
          <Tabs.Trigger value="tab-1">Tab 1</Tabs.Trigger>
          <Tabs.Trigger value="tab-2">Tab 2</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab-1">Content 1</Tabs.Content>
        <Tabs.Content value="tab-2">Content 2</Tabs.Content>
      </Tabs>
    ),
  }
)
