import { TestUiBackLink, TestUiLayout, TestUiPlaceholder } from "@/components/test-ui/test-ui-layout";

export default function TestUiBadgesPage() {
  return (
    <TestUiLayout
      title="Test UI / Badges"
      description="Plánovaná surface pro mapování Akcia, Novinka, Tip, promo a utility badges."
      actions={<TestUiBackLink />}
    >
      <TestUiPlaceholder
        title="Badge showcase"
        summary="Další krok po buttons. Tady se budou ověřovat varianty badge contractu proti produktovým a hero surface z Figmy."
        nextSteps={[
          "Mapovat Figma promo flags na current Badge variants bez zavádění nových shared API.",
          "Ověřit utility badges pro search toolbar, account a info surface.",
          "Teprve pak rozhodnout, jestli je potřeba další component-specific token override.",
        ]}
      />
    </TestUiLayout>
  );
}
