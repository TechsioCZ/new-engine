import figma from "@figma/code-connect"
import { Header } from "./header"

figma.connect(
  Header,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1391-225",
  {
    imports: ['import { Header } from "@libs/ui/organisms/header"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
    },
    example: ({ size }) => (
      <Header size={size}>
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
      </Header>
    ),
  }
)
