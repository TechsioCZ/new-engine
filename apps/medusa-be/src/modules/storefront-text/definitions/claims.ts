import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_CLAIMS_TEXT_DEFINITIONS = [
  {
    description: "Odkaz drobečkové navigace na domovskou stránku.",
    key: "claims.breadcrumb_home",
    namespace: "claims",
  },
  {
    description: "Aktuální položka drobečkové navigace reklamací a vrácení.",
    key: "claims.breadcrumb_current",
    namespace: "claims",
  },
  {
    description: "Hlavní nadpis stránky reklamací a vrácení.",
    key: "claims.title",
    namespace: "claims",
  },
  {
    description: "Úvodní instrukce stránky reklamací a vrácení.",
    key: "claims.intro",
    namespace: "claims",
  },
  {
    description: "Nadpis přehledu postupu reklamace nebo vrácení.",
    key: "claims.how_title",
    namespace: "claims",
  },
  {
    description: "Krok postupu pro výběr typu požadavku.",
    key: "claims.how_step_type",
    namespace: "claims",
  },
  {
    description: "Krok postupu pro ověření objednávky.",
    key: "claims.how_step_verify",
    namespace: "claims",
  },
  {
    description: "Krok postupu pro výběr položek a množství.",
    key: "claims.how_step_items",
    namespace: "claims",
  },
  {
    description: "Krok postupu pro odeslání požadavku.",
    key: "claims.how_step_submit",
    namespace: "claims",
  },
  {
    description: "Nápověda pro přechod na ruční zadání požadavku.",
    key: "claims.manual_note",
    namespace: "claims",
  },
  {
    description: "Výzva k dokončení ochrany proti robotům.",
    key: "claims.captcha_required",
    namespace: "claims",
  },
  {
    description: "Popisek e-mailu použitého u objednávky.",
    key: "claims.email_label",
    namespace: "claims",
  },
  {
    description: "Popisek čísla objednávky.",
    key: "claims.order_number_label",
    namespace: "claims",
  },
  {
    description: "Akce pro odeslání ověřovacího kódu.",
    key: "claims.send_code",
    namespace: "claims",
  },
  {
    description: "Akce pro přechod na ruční zadání požadavku.",
    key: "claims.manual_entry",
    namespace: "claims",
  },
  {
    description: "Potvrzení odeslání kódu na e-mail {email}.",
    key: "claims.code_sent",
    namespace: "claims",
  },
  {
    description: "Popisek pole ověřovacího kódu.",
    key: "claims.code_label",
    namespace: "claims",
  },
  {
    description: "Akce pro ověření objednávky.",
    key: "claims.verify_order",
    namespace: "claims",
  },
  {
    description: "Obecná akce pro návrat na předchozí krok.",
    key: "claims.back",
    namespace: "claims",
  },
  {
    description: "Chyba neplatného ověřovacího kódu.",
    key: "claims.code_invalid",
    namespace: "claims",
  },
  {
    description: "Chyba neúplných povinných údajů požadavku.",
    key: "claims.details_incomplete",
    namespace: "claims",
  },
  {
    description: "Chyba chybějícího popisu vady.",
    key: "claims.defect_required",
    namespace: "claims",
  },
  {
    description: "Obecná chyba zpracování reklamace nebo vrácení.",
    key: "claims.generic_error",
    namespace: "claims",
  },
  {
    description: "Nadpis ověřené objednávky {orderNumber}.",
    key: "claims.order_heading",
    namespace: "claims",
  },
  {
    description: "Popisek kontaktního e-mailu.",
    key: "claims.contact_email_label",
    namespace: "claims",
  },
  {
    description: "Popisek názvu produktu v ručním formuláři.",
    key: "claims.product_name_label",
    namespace: "claims",
  },
  {
    description: "Popisek údajů o nákupu v ručním formuláři.",
    key: "claims.purchase_details_label",
    namespace: "claims",
  },
  {
    description: "Popisek volitelného důvodu vrácení.",
    key: "claims.return_reason_optional",
    namespace: "claims",
  },
  {
    description: "Popisek volitelných doplňujících informací reklamace.",
    key: "claims.complaint_info_optional",
    namespace: "claims",
  },
  {
    description: "Popisek popisu vady produktu.",
    key: "claims.defect_description_label",
    namespace: "claims",
  },
  {
    description: "Popisek výběru požadovaného řešení.",
    key: "claims.requested_resolution",
    namespace: "claims",
  },
  {
    description: "Možnost řešení reklamace opravou.",
    key: "claims.resolution_repair",
    namespace: "claims",
  },
  {
    description: "Možnost řešení reklamace výměnou.",
    key: "claims.resolution_replacement",
    namespace: "claims",
  },
  {
    description: "Možnost řešení reklamace slevou.",
    key: "claims.resolution_discount",
    namespace: "claims",
  },
  {
    description: "Možnost řešení reklamace vrácením peněz.",
    key: "claims.resolution_refund",
    namespace: "claims",
  },
  {
    description: "Akce pro odeslání žádosti o vrácení produktu.",
    key: "claims.submit_return",
    namespace: "claims",
  },
  {
    description: "Akce pro odeslání reklamace produktu.",
    key: "claims.submit_complaint",
    namespace: "claims",
  },
  {
    description: "Nadpis výběru produktů z objednávky.",
    key: "claims.select_products",
    namespace: "claims",
  },
  {
    description: "Text objednaného množství {quantity}.",
    key: "claims.ordered_quantity",
    namespace: "claims",
  },
  {
    description: "Popisek množství položky {title}.",
    key: "claims.item_quantity",
    namespace: "claims",
  },
  {
    description: "Potvrzení odeslání případu {caseNumber}.",
    key: "claims.success_case",
    namespace: "claims",
  },
  {
    description: "Informace o následném potvrzení e-mailem.",
    key: "claims.success_followup",
    namespace: "claims",
  },
  {
    description: "Otázka pro výběr typu požadavku.",
    key: "claims.type_question",
    namespace: "claims",
  },
  {
    description: "Název typu požadavku na vrácení produktu.",
    key: "claims.return_title",
    namespace: "claims",
  },
  {
    description: "Popis typu požadavku na vrácení produktu.",
    key: "claims.return_description",
    namespace: "claims",
  },
  {
    description: "Název typu požadavku na reklamaci produktu.",
    key: "claims.complaint_title",
    namespace: "claims",
  },
  {
    description: "Popis typu požadavku na reklamaci produktu.",
    key: "claims.complaint_description",
    namespace: "claims",
  },
] as const satisfies readonly StorefrontTextDefinition[]
