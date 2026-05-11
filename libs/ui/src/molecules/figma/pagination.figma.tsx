import figma from "@figma/code-connect"
import { Pagination } from "../pagination"

figma.connect(
  Pagination,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1143-138",
  {
    imports: ['import { Pagination } from "@techsio/ui-kit/molecules/pagination"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
    },
    example: ({ size }) => (
      <Pagination
        size={size}
        count={100}
        pageSize={10}
        defaultPage={1}
        getPageUrl={(page) => `?page=${page}`}
      />
    ),
  }
)
