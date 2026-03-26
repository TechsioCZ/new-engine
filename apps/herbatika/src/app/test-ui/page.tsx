"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { AppSpecificShowcase } from "@/components/test-ui/app-specific-showcase";
import { BadgesShowcase } from "@/components/test-ui/badges-showcase";
import { ButtonShowcase } from "@/components/test-ui/button-showcase";
import { CheckoutShowcase } from "@/components/test-ui/checkout-showcase";
import { FooterShowcase } from "@/components/test-ui/footer-showcase";
import { HeaderShowcase } from "@/components/test-ui/header-showcase";
import { NumericInputShowcase } from "@/components/test-ui/numeric-input-showcase";
import { ProductCardShowcase } from "@/components/test-ui/product-card-showcase";
import { SearchFormShowcase } from "@/components/test-ui/search-form-showcase";
import { SelectShowcase } from "@/components/test-ui/select-showcase";
import {
  TestUiLayout,
  TestUiPlaceholder,
  TestUiSurfaceGrid,
} from "@/components/test-ui/test-ui-layout";

export default function TestUiPage() {
  return (
    <TestUiLayout
      title="Herbatika Test UI"
      description="Paralelní referenční playground nad tokens-2 a current libs/ui contractem. Slouží jako bezpečný spike prostor před cutoverem do produkční appky."
      actions={<Badge variant="success">tokens-2 active</Badge>}
    >
      <TestUiSurfaceGrid />

      <AppSpecificShowcase />
      <BadgesShowcase />
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
        summary="Core form, checkout, badges i první app-specific wrappers už mají referenční showcase. Další krok je vizuální kontrola a teprve potom rozhodování o cutoveru do reálné appky."
        nextSteps={[
          "Radio / radio-group: samostatně dopsat shared primitive gap pro checkout selection.",
          "Vizuální review: projít surface proti Figmě a potvrdit finální token drift.",
          "Cutover review: projít, které app-specific wrappery už jsou dost stabilní pro napojení do reálných flow.",
        ]}
      />
    </TestUiLayout>
  );
}
