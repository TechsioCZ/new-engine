// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-32835
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/search-form.tsx
// component=SearchForm

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const gapped = figma.selectedInstance.getBoolean("gapped")

export default {
  id: "SearchForm",
  imports: ['import { SearchForm } from "@techsio/ui-kit/molecules/search-form"'],
  example: figma.tsx`<SearchForm${figma.helpers.react.renderProp(
    "gapped",
    gapped,
  )}${figma.helpers.react.renderProp("size", size)}>
        <SearchForm.Control>
          <SearchForm.Input placeholder="Search..."/>
          <SearchForm.Button />
        </SearchForm.Control>
      </SearchForm>`,
  metadata: { nestable: true },
}
