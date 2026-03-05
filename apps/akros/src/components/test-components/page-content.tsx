import { AccountOverlaySection } from "./account-overlay-section"
import { ButtonsSection } from "./buttons-section"
import { CarouselSection } from "./carousel-section"
import { CheckoutStepsSection } from "./checkout-steps-section"
import { FooterSection } from "./footer-section"
import { FormsSection } from "./forms-section"
import { HeaderSearchSection } from "./header-search-section"
import { NavigationSection } from "./navigation-section"
import { ProductSection } from "./product-section"
import { TableSection } from "./table-section"

export function TestComponentsPageContent() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-max-w flex-col gap-500 p-500">
      <section className="rounded-md border border-border-primary bg-surface p-500">
        <h1 className="text-2xl font-bold">/test-components</h1>
        <p className="mt-200 text-md text-fg-secondary">
          Přehled komponent z Figma podkladů v kombinacích, které se v Akros
          návrhu objevují.
        </p>
      </section>

      <HeaderSearchSection />
      <CarouselSection />
      <ButtonsSection />
      <ProductSection />
      <NavigationSection />
      <CheckoutStepsSection />
      <FormsSection />
      <TableSection />
      <AccountOverlaySection />
      <FooterSection />
    </main>
  )
}
