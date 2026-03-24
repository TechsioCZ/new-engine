export type TestUiSurfaceId =
  | "buttons"
  | "badges"
  | "header"
  | "footer"
  | "product-card"
  | "search-form"
  | "select"
  | "numeric-input"
  | "checkout";

export type TestUiSurface = {
  id: TestUiSurfaceId;
  title: string;
  href: string;
  description: string;
  status: "ready" | "planned";
  notes: string;
};

export const TEST_UI_SURFACES: TestUiSurface[] = [
  {
    id: "buttons",
    title: "Buttons",
    href: "/test-ui/buttons",
    description: "CTA, add-to-cart, view-more a outlined pill varianty z Figmy.",
    status: "ready",
    notes: "První reálný showcase. Slouží jako vzor pro další surface.",
  },
  {
    id: "badges",
    title: "Badges",
    href: "/test-ui/badges",
    description: "Akcia, Novinka, Tip, info a utility badge surface.",
    status: "planned",
    notes: "Naváže na produktové a hero karty.",
  },
  {
    id: "header",
    title: "Header",
    href: "/test-ui/header",
    description: "Desktop utility řádek, nav strip, search a action items.",
    status: "ready",
    notes: "Kritická brand surface. První showcase je připravený.",
  },
  {
    id: "footer",
    title: "Footer",
    href: "/test-ui/footer",
    description: "Column layout, social icons, rating blocky a legal bottom.",
    status: "ready",
    notes: "Kritická brand surface. První showcase je připravený.",
  },
  {
    id: "product-card",
    title: "Product Card",
    href: "/test-ui/product-card",
    description: "Produktová karta s badge, cenou, slevou a CTA.",
    status: "ready",
    notes: "Druhá nejdůležitější e-shop surface po header/footer.",
  },
  {
    id: "search-form",
    title: "Search Form",
    href: "/test-ui/search-form",
    description: "Header search pole, placeholder, tlačítko a focus states.",
    status: "ready",
    notes: "Silně propojené s header surface.",
  },
  {
    id: "select",
    title: "Select",
    href: "/test-ui/select",
    description: "Checkout a PDP select surface.",
    status: "ready",
    notes: "Důležité pro checkout a variant picker.",
  },
  {
    id: "numeric-input",
    title: "Numeric Input",
    href: "/test-ui/numeric-input",
    description: "Quantity control pro cart row a PDP.",
    status: "ready",
    notes: "Musí odstranit současný contract drift.",
  },
  {
    id: "checkout",
    title: "Checkout Rows",
    href: "/test-ui/checkout",
    description: "Shipping/payment rows, summary a benefit row.",
    status: "ready",
    notes: "Po form controls a button family.",
  },
];
