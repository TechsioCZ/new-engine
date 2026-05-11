import figma from "@figma/code-connect"
import { SearchForm } from "../search-form"

figma.connect(
  SearchForm,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1146-48",
  {
    imports: ['import { SearchForm } from "@techsio/ui-kit/molecules/search-form"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
    },
    example: ({ size }) => (
      <SearchForm size={size}>
        <SearchForm.Input placeholder="Search..." />
        <SearchForm.Button />
      </SearchForm>
    ),
  }
)
