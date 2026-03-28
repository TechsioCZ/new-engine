import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input";
import { SupportingText } from "@/components/text/supporting-text";

// function CartRowNumericInput() {
//   return (
//     <div className="w-fit">
//       <NumericInput allowOverflow={false} defaultValue={2} inputMode="numeric" max={99} min={1} size="sm">
//         <NumericInput.Control>
//           <NumericInput.DecrementTrigger icon="icon-[mdi--minus]" />
//           <NumericInput.Input aria-label="Množstvo v košíku" />
//           <NumericInput.IncrementTrigger icon="icon-[mdi--plus]" />
//         </NumericInput.Control>
//       </NumericInput>
//     </div>
//   );
// }

function ProductDetailNumericInput() {
  return (
    <div className="w-fit">
      <NumericInput defaultValue={1} id="product-quantity-preview" inputMode="numeric" max={50} min={1} size="md">
        <NumericInput.Control>
          <NumericInput.DecrementTrigger />
          <NumericInput.Input aria-label="Množstvo na detaile produktu" className="text-center" />
          <NumericInput.IncrementTrigger />
        </NumericInput.Control>
      </NumericInput>
    </div>
  );
}

export function NumericInputShowcase() {
  return (
    <div className="space-y-500">
      <section className="grid gap-300 xl:grid-cols-2">
       {/* <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Cart row quantity</h2>
            <SupportingText>Quantity control pro mini-cart a cart row surface.</SupportingText>
          </div>
           <div className="rounded-md bg-highlight p-400">
            <CartRowNumericInput />
          </div> 
        </article>*/}

        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">PDP quantity picker</h2>
            <SupportingText>Quantity control pro product detail purchase panel.</SupportingText>
          </div>
          <div className="rounded-md bg-highlight p-400 w-32">
            <ProductDetailNumericInput />
          </div>
        </article>
      </section>

    </div>
  );
}
