import figma from "@figma/code-connect"
import { SearchForm } from "./search-form"

figma.connect(
  SearchForm,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=2620-122",
  {
    imports: ['import { SearchForm } from "@libs/ui/molecules/search-form"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      gapped: figma.boolean("gapped"),
    },
    example: ({ size, gapped }) => (
      <SearchForm gapped={gapped} size={size}>
        <SearchForm.Control>
          <SearchForm.Input placeholder="Search..." />
          <SearchForm.Button />
        </SearchForm.Control>
      </SearchForm>
    ),
  }
)
