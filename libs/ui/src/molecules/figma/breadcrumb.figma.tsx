import figma from "@figma/code-connect"
import { Breadcrumb } from "../breadcrumb"

figma.connect(
  Breadcrumb,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=828-162",
  {
    imports: ['import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
    },
    example: ({ size }) => (
      <Breadcrumb size={size}>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink>Current</Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb>
    ),
  }
)
