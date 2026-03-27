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
      actions={<Badge variant="success">tokens-2 active</Badge>}
      description="Paralelní referenční playground nad tokens-2 a current libs/ui contractem. Slouží jako bezpečný spike prostor před cutoverem do produkční appky."
      title="Herbatika Test UI"
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
        nextSteps={[
          "Checkout radios: potvrdit spacing, hierarchii ceny a selected state nového RadioCard a RadioGroup proti Figmě.",
          "Vizuální review: projít surface proti Figmě a potvrdit finální token drift.",
          "Cutover review: projít, které app-specific wrappery už jsou dost stabilní pro napojení do reálných flow.",
        ]}
        summary="Core form, checkout, badges i první app-specific wrappers už mají referenční showcase. Další krok je vizuální kontrola a teprve potom rozhodování o cutoveru do reálné appky."
        title="Další doporučené bloky"
      />
    </TestUiLayout>
  );
}
