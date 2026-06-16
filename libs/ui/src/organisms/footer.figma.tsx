import figma from "@figma/code-connect"
import { Footer } from "./footer"

figma.connect(
  Footer,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1372-161",
  {
    imports: ['import { Footer } from "@libs/ui/organisms/footer"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
    },
    example: ({ size }) => (
      <Footer size={size}>
        <Footer.Container>
          <Footer.Section>
            <Footer.Title>Shop</Footer.Title>
            <Footer.List>
              <li>
                <Footer.Link href="/new">New arrivals</Footer.Link>
              </li>
              <li>
                <Footer.Link href="/sale">Sale</Footer.Link>
              </li>
            </Footer.List>
          </Footer.Section>
        </Footer.Container>
        <Footer.Divider />
        <Footer.Bottom>
          <Footer.Text>© 2026 Acme, Inc.</Footer.Text>
        </Footer.Bottom>
      </Footer>
    ),
  }
)
