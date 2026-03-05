import { Image } from "@ui/atoms/image"
import { Footer } from "@ui/organisms/footer"
import { TestComponentsSection } from "./section"

export function FooterSection() {
  return (
    <TestComponentsSection
      title="Footer"
      description="Footer compound pattern: sloupce, kontakty, logo řádek a spodní informace."
    >
      <Footer direction="vertical" layout="col" sectionFlow="col" size="md">
        <Footer.Container>
          <Footer.Section>
            <Footer.Title>Sortiment</Footer.Title>
            <Footer.List>
              <Footer.Link href="#">Lehátka</Footer.Link>
              <Footer.Link href="#">Matrace</Footer.Link>
              <Footer.Link href="#">Doplňky</Footer.Link>
            </Footer.List>
          </Footer.Section>

          <Footer.Section>
            <Footer.Title>Služby</Footer.Title>
            <Footer.List>
              <Footer.Link href="#">Doprava a platba</Footer.Link>
              <Footer.Link href="#">Reklamace</Footer.Link>
              <Footer.Link href="#">Obchodní podmínky</Footer.Link>
            </Footer.List>
          </Footer.Section>

          <Footer.Section>
            <Footer.Title>Kontakt</Footer.Title>
            <Footer.List>
              <Footer.Text className="inline-flex items-center gap-100">
                <span className="token-icon-phone" /> +420 777 000 000
              </Footer.Text>
              <Footer.Text className="inline-flex items-center gap-100">
                <span className="token-icon-email" /> info@akros.cz
              </Footer.Text>
            </Footer.List>
          </Footer.Section>

          <Footer.Section>
            <Footer.Title>Platební metody</Footer.Title>
            <Footer.List>
              <Footer.Text className="inline-flex items-center gap-100">
                <Image alt="Visa" size="sm" src="/tshirt.webp" />
                Visa / Mastercard
              </Footer.Text>
            </Footer.List>
          </Footer.Section>
        </Footer.Container>

        <Footer.Divider />

        <Footer.Bottom>
          <Footer.Text>© 2026 Akros s.r.o.</Footer.Text>
          <Footer.Text>Bezpečný nákup a ověřený e-shop</Footer.Text>
        </Footer.Bottom>
      </Footer>
    </TestComponentsSection>
  )
}
