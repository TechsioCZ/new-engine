import figma from "@figma/code-connect"
import { Pagination } from "./pagination"

figma.connect(
  Pagination,
  "https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System-vol.-2?node-id=1143-138",
  {
    imports: ['import { Pagination } from "@libs/ui/molecules/pagination"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
    },
    example: ({ size }) => (
      <Pagination
        count={100}
        defaultPage={1}
        getPageUrl={(page) => `?page=${page}`}
        pageSize={10}
        size={size}
      />
    ),
  }
)
