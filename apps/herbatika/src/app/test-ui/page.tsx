"use client"
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { TestUiLayout, TestUiPlaceholder, TestUiSurfaceGrid } from "@/components/test-ui/test-ui-layout";
import { CheckoutShowcase } from "@/components/test-ui/checkout-showcase";
import { ButtonShowcase } from "@/components/test-ui/button-showcase";
import { FooterShowcase } from "@/components/test-ui/footer-showcase";
import { HeaderShowcase } from "@/components/test-ui/header-showcase";
import { NumericInputShowcase } from "@/components/test-ui/numeric-input-showcase";
import { ProductCardShowcase } from "@/components/test-ui/product-card-showcase";
import { SearchFormShowcase } from "@/components/test-ui/search-form-showcase";
import { SelectShowcase } from "@/components/test-ui/select-showcase";

export default function TestUiPage() {
  return (
    <TestUiLayout
      title="Herbatika Test UI"
      description="Paralelní referenční playground nad tokens-2 a current libs/ui contractem. Slouží jako bezpečný spike prostor před cutoverem do produkční appky."
      actions={<Badge variant="success">tokens-2 active</Badge>}
    >
      <TestUiSurfaceGrid />

      <ButtonShowcase />
      <HeaderShowcase />
      <FooterShowcase />
      <ProductCardShowcase />
      <SearchFormShowcase />
      <SelectShowcase />
      <NumericInputShowcase />
      <CheckoutShowcase />

      <TestUiPlaceholder
        title="Další doporučené bloky"
        summary="Core form a checkout surface už mají první showcase. Další logický krok jsou badge surface a jemnější app wrappers jako category chips nebo account utility blocks."
        nextSteps={[
          "Badges: promo flagy a utility badge surface podle Figmy.",
          "Category chips / sort pills: rozhodnout app-local composition vs shared gap.",
          "Account utility surface: zkontrolovat, co zůstane čistě app wrapper.",
        ]}
      />
    </TestUiLayout>
  );
}
