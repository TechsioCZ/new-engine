import figma from "@figma/code-connect"
import { TreeView } from "../tree-view"

figma.connect(
  TreeView,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1193-228",
  {
    imports: ['import { TreeView } from "@techsio/ui-kit/molecules/tree-view"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
    },
    example: ({ size }) => (
      <TreeView
        size={size}
        data={[
          {
            id: "1",
            name: "Root",
            children: [{ id: "1-1", name: "Child" }],
          },
        ]}
      />
    ),
  }
)
