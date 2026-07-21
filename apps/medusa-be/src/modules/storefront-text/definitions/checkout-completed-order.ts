import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_CHECKOUT_COMPLETED_ORDER_TEXT_DEFINITIONS = [
  {
    description: "Nadpis potvrzení dokončené objednávky.",
    key: "checkout.completed_order_title",
    namespace: "checkout",
  },
  {
    description: "Potvrzení vytvořené objednávky s jejím identifikátorem.",
    key: "checkout.completed_order_created",
    namespace: "checkout",
  },
  {
    description: "Stav přípravy QR údajů pro bankovní převod.",
    key: "checkout.completed_order_qr_preparing",
    namespace: "checkout",
  },
  {
    description: "Chyba při načtení QR platby dokončené objednávky.",
    key: "checkout.completed_order_qr_failed",
    namespace: "checkout",
  },
  {
    description: "Akce pro pokračování v nákupu po dokončení objednávky.",
    key: "checkout.completed_order_continue_shopping",
    namespace: "checkout",
  },
  {
    description: "Akce pro přechod do zákaznického účtu po objednávce.",
    key: "checkout.completed_order_go_to_account",
    namespace: "checkout",
  },
  {
    description: "Popisek částky v údajích QR platby.",
    key: "checkout.completed_order_qr_amount",
    namespace: "checkout",
  },
  {
    description: "Popisek IBAN v údajích QR platby.",
    key: "checkout.completed_order_qr_iban",
    namespace: "checkout",
  },
  {
    description: "Popisek platební reference v údajích QR platby.",
    key: "checkout.completed_order_qr_reference",
    namespace: "checkout",
  },
  {
    description: "Popisek zprávy v údajích QR platby.",
    key: "checkout.completed_order_qr_message",
    namespace: "checkout",
  },
  {
    description: "Přístupný název QR kódu pro platbu objednávky.",
    key: "checkout.completed_order_qr_aria",
    namespace: "checkout",
  },
  {
    description: "Nadpis platby bankovním převodem po dokončení objednávky.",
    key: "checkout.completed_order_bank_transfer_title",
    namespace: "checkout",
  },
  {
    description: "Pokyny k QR platbě bankovním převodem.",
    key: "checkout.completed_order_bank_transfer_instructions",
    namespace: "checkout",
  },
] as const satisfies readonly StorefrontTextDefinition[]
