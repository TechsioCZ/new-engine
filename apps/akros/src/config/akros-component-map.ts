export type AkrosScreenKey =
  | "header"
  | "footer"
  | "carousel"
  | "product_card"
  | "pdp_single_size"
  | "pdp_multi_size"
  | "cart_checkout"
  | "my_account"

export type AkrosComponentRecommendation = {
  screen: AkrosScreenKey
  figmaFiles: string[]
  uiComponents: string[]
  notes: string
}

export const AKROS_COMPONENT_MAP: AkrosComponentRecommendation[] = [
  {
    screen: "header",
    figmaFiles: ["header.png", "header.css"],
    uiComponents: ["Header", "SearchForm", "Button", "Icon", "Image"],
    notes: "Desktop header with search, account/wishlist/cart actions.",
  },
  {
    screen: "footer",
    figmaFiles: ["footer.png", "footer.css"],
    uiComponents: ["Footer", "Link", "Icon", "Image"],
    notes: "Four-column footer with contact/social/payment and legal row.",
  },
  {
    screen: "carousel",
    figmaFiles: ["carousel.png", "carousel.css"],
    uiComponents: ["Carousel"],
    notes: "Hero carousel with overlay heading and dot indicators.",
  },
  {
    screen: "product_card",
    figmaFiles: ["product-card.png", "product-card.css"],
    uiComponents: ["ProductCard", "Badge", "Button", "Rating", "StatusText"],
    notes: "Card with badges, stock text, pricing and main CTA.",
  },
  {
    screen: "pdp_single_size",
    figmaFiles: ["produkt-s-jednoou-velikosti.png", "produkt-s-jednou-velikosti.css"],
    uiComponents: ["Badge", "StatusText", "NumericInput", "Button", "Table", "Breadcrumb"],
    notes: "Single-size detail with tier pricing block and add-to-cart row.",
  },
  {
    screen: "pdp_multi_size",
    figmaFiles: ["produkt-s-vice-velikostmi.png", "produkt-s-vice-velikostmi.css"],
    uiComponents: ["Table", "NumericInput", "Button", "Checkbox", "Input", "Select"],
    notes: "Variant grid and list-based product table with quantity actions.",
  },
  {
    screen: "cart_checkout",
    figmaFiles: ["cart-step-1.png", "cart-step-2.png", "cart-step-3-b2b.png", "cart-step-4.png", "kosik.png", "kosiki.css"],
    uiComponents: ["Steps", "Table", "NumericInput", "FormInput", "Select", "FormCheckbox", "StatusText", "Button"],
    notes: "Checkout wizard and cart summary; radio-like selectors are required.",
  },
  {
    screen: "my_account",
    figmaFiles: ["my-account.png", "my-account-2.png"],
    uiComponents: ["Tabs", "FormInput", "FormTextarea", "FormCheckbox", "Select", "Button"],
    notes: "Account profile forms with validation and tab-based navigation.",
  },
]
