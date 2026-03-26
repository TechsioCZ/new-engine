"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { AppSpecificShowcase } from "@/components/test-ui/app-specific-showcase";
import { ButtonShowcase } from "@/components/test-ui/button-showcase";
import { CheckoutShowcase } from "@/components/test-ui/checkout-showcase";
import { FooterShowcase } from "@/components/test-ui/footer-showcase";
import { HeaderShowcase } from "@/components/test-ui/header-showcase";
import { NumericInputShowcase } from "@/components/test-ui/numeric-input-showcase";
import { ProductCardShowcase } from "@/components/test-ui/product-card-showcase";
import { SearchFormShowcase } from "@/components/test-ui/search-form-showcase";
import { SelectShowcase } from "@/components/test-ui/select-showcase";
import {
  TestUiBackLink,
  TestUiLayout,
} from "@/components/test-ui/test-ui-layout";

export default function TestUiAllPage() {
  return (
    <TestUiLayout
      title="Test UI / All"
      description="Jeden souhrnný review canvas pro všechny hotové Herbatika test-ui surface nad tokens-2 a current libs/ui contractem."
      actions={
        <div className="flex flex-wrap items-center gap-150">
          <Badge variant="success">all-in-one review</Badge>
          <TestUiBackLink />
        </div>
      }
    >
      <AppSpecificShowcase />
      <ButtonShowcase />
      <HeaderShowcase />
      <FooterShowcase />
      <ProductCardShowcase />
      <SearchFormShowcase />
      <SelectShowcase />
      <NumericInputShowcase />
      <CheckoutShowcase />
    </TestUiLayout>
  );
}
