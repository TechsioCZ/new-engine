// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-38878
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/organisms/header.tsx
// component=Header

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})

export default {
  id: "Header",
  imports: ['import { Header } from "@libs/ui/organisms/header"'],
  example: figma.tsx`<Header${figma.helpers.react.renderProp("size", size)}>
        <Header.Desktop>
          <Header.Container position="start">Logo</Header.Container>
          <Header.Nav>
            <Header.NavItem active>Home</Header.NavItem>
            <Header.NavItem>Shop</Header.NavItem>
            <Header.NavItem>About</Header.NavItem>
          </Header.Nav>
          <Header.Actions>
            <Header.ActionItem>Cart</Header.ActionItem>
          </Header.Actions>
        </Header.Desktop>
        <Header.Hamburger />
        <Header.Mobile>
          <Header.NavItem>Home</Header.NavItem>
          <Header.NavItem>Shop</Header.NavItem>
        </Header.Mobile>
      </Header>`,
  metadata: { nestable: true },
}
