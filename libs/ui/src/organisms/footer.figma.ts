// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-38666
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/organisms/footer.tsx
// component=Footer

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})

export default {
  id: "Footer",
  imports: ['import { Footer } from "@libs/ui/organisms/footer"'],
  example: figma.tsx`<Footer${figma.helpers.react.renderProp("size", size)}>
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
      </Footer>`,
  metadata: { nestable: true },
}
