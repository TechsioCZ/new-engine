import figma from "@figma/code-connect"
import { Link } from "./link"

figma.connect(
  Link,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1355-13",
  {
    imports: ['import { Link } from "@techsio/ui-kit/atoms/link"'],
    props: {
      children: figma.string("children"),
    },
    example: ({ children }) => <Link href="#">{children}</Link>,
  }
)
