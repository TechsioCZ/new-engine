import { Badge } from "@techsio/ui-kit/atoms/badge";
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input";
import { SupportingText } from "@/components/text/supporting-text";

const NUMERIC_INPUT_NOTES = [
  "Current NumericInput contract je compound pattern přes Control/Input/TriggerContainer/Triggers.",
  "Původní Herbatika drift byl hlavně v neplatných props na trigger slots.",
  "PDP a cart row quantity picker jdou řešit přes app composition + tokens-2.",
] as const;

function CartRowNumericInput() {
  return (
    <NumericInput allowOverflow={false} className="h-750 gap-0 border-collapse" max={99} min={1} size="sm" value={2}>
      <NumericInput.Control className="w-full max-w-900 rounded-sm border border-border-primary">
        <NumericInput.DecrementTrigger className="min-w-300 text-fg-primary" icon="icon-[mdi--minus]" />
        <NumericInput.Input aria-label="Množstvo v košíku" className="font-inter text-center text-md leading-relaxed" />
        <NumericInput.IncrementTrigger className="min-w-300 text-fg-primary" icon="icon-[mdi--plus]" />
      </NumericInput.Control>
    </NumericInput>
  );
}

function ProductDetailNumericInput() {
  return (
    <NumericInput id="product-quantity-preview" max={50} min={1} size="sm" value={1}>
      <div className="grid grid-cols-3 overflow-hidden rounded-sm border border-border-primary">
        <NumericInput.DecrementTrigger
          className="rounded-none border-0 bg-transparent px-0 py-300 text-md leading-tight text-fg-primary disabled:opacity-35"
          icon="icon-[mdi--minus]"
          theme="borderless"
        />
        <NumericInput.Control className="rounded-none border-x-0 border-y-0 border-border-primary bg-transparent">
          <NumericInput.Input className="rounded-none border-0 px-200 py-300 text-center text-md" />
        </NumericInput.Control>
        <NumericInput.IncrementTrigger
          className="rounded-none border-0 bg-transparent px-0 py-300 text-md leading-tight text-fg-primary"
          icon="icon-[mdi--plus]"
          theme="borderless"
        />
      </div>
    </NumericInput>
  );
}

export function NumericInputShowcase() {
  return (
    <div className="space-y-500">
      <section className="grid gap-300 xl:grid-cols-2">
        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Cart row quantity</h2>
            <SupportingText>Quantity control pro mini-cart a cart row surface.</SupportingText>
          </div>
          <div className="rounded-md bg-highlight p-400">
            <CartRowNumericInput />
          </div>
        </article>

        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">PDP quantity picker</h2>
            <SupportingText>Quantity control pro product detail purchase panel.</SupportingText>
          </div>
          <div className="rounded-md bg-highlight p-400">
            <ProductDetailNumericInput />
          </div>
        </article>
      </section>

      <section className="space-y-150 rounded-md border border-border-secondary bg-surface p-400">
        {NUMERIC_INPUT_NOTES.map((item, index) => (
          <div className="flex items-start gap-200 rounded-sm bg-highlight px-300 py-250" key={item}>
            <Badge variant="secondary">{String(index + 1)}</Badge>
            <SupportingText className="text-fg-primary">{item}</SupportingText>
          </div>
        ))}
      </section>
    </div>
  );
}
