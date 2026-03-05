import { Button } from "@ui/atoms/button"
import { Link } from "@ui/atoms/link"
import { Accordion } from "@ui/molecules/accordion"
import { SearchForm } from "@ui/molecules/search-form"
import { Header } from "@ui/organisms/header"
import { TestComponentsSection } from "./section"

export function HeaderSearchSection() {
  return (
    <TestComponentsSection
      title="Header + SearchForm"
      description="Header `size=md`, search input + primary CTA, unstyled icon akce a košíkové tlačítko."
    >
      <div className="flex flex-col gap-200">
        <Header size="md">
          <Header.Desktop>
            <Header.Container position="start">
              <Link href="/" className="font-semibold text-lg">
                AKROS
              </Link>
            </Header.Container>

            <Header.Container position="center">
              <SearchForm size="md" className="w-full">
                <SearchForm.Control>
                  <SearchForm.Input placeholder="Hledat produkt" />
                  <SearchForm.Button showSearchIcon theme="solid" variant="primary">
                    Hledat
                  </SearchForm.Button>
                </SearchForm.Control>
              </SearchForm>
            </Header.Container>

            <Header.Container position="end">
              <Header.Actions>
                <Header.ActionItem>
                  <Button icon="token-icon-user" size="current" theme="unstyled" />
                </Header.ActionItem>
                <Header.ActionItem>
                  <Button icon="token-icon-heart" size="current" theme="unstyled" />
                </Header.ActionItem>
                <Header.ActionItem>
                  <Button
                    icon="token-icon-cart"
                    iconPosition="left"
                    size="lg"
                    theme="solid"
                    variant="primary"
                  >
                    0 Kč
                  </Button>
                </Header.ActionItem>
              </Header.Actions>
            </Header.Container>
          </Header.Desktop>

          <Header.Mobile>
            <Accordion variant="child">
              <Header.NavItem active>
                <Link href="/">Domů</Link>
              </Header.NavItem>
              <Header.NavItem>
                <Link href="/produkty">Produkty</Link>
              </Header.NavItem>
              <Header.NavItem>
                <Link href="/kontakt">Kontakt</Link>
              </Header.NavItem>
            </Accordion>
          </Header.Mobile>

          <Header.Hamburger className="ml-auto" />
        </Header>
      </div>
    </TestComponentsSection>
  )
}
