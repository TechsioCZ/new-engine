import type { StorefrontTextDefinition } from "../configuration"

const defineCatalogProductText = <const Key extends string>(
  key: Key,
  description: string
) =>
  ({
    description,
    key,
    namespace: "catalog",
  }) satisfies StorefrontTextDefinition

export const STOREFRONT_CATALOG_PRODUCT_TEXT_DEFINITIONS = [
  defineCatalogProductText(
    "catalog.product_card.price_on_request",
    "Zástupný text ceny produktu, když katalog neposkytne cenu."
  ),
  defineCatalogProductText(
    "catalog.product_card.collection_empty",
    "Prázdný stav kolekce bez dostupných produktů."
  ),
  defineCatalogProductText(
    "catalog.product_card.recently_visited_title",
    "Nadpis sekce naposledy navštívených produktů."
  ),
  defineCatalogProductText(
    "catalog.product_card.recently_visited_empty",
    "Prázdný stav sekce naposledy navštívených produktů."
  ),
  defineCatalogProductText(
    "catalog.product_detail.errors.load_failed",
    "Obecná chyba při načítání detailu produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.errors.not_found",
    "Chyba pro nenalezený produkt."
  ),
  defineCatalogProductText(
    "catalog.product_detail.retry",
    "Akce pro opakování načtení produktové plochy."
  ),
  defineCatalogProductText(
    "catalog.product_detail.back_home",
    "Akce pro návrat z nenalezeného produktu na domovskou stránku."
  ),
  defineCatalogProductText(
    "catalog.product_detail.price_on_request",
    "Zástupný text ceny na detailu produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.information_title",
    "Nadpis informačních sekcí na detailu produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.sections.description",
    "Název sekce popisu produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.sections.usage",
    "Název sekce použití produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.sections.composition",
    "Název sekce složení produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.sections.warning",
    "Název sekce upozornění produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.sections.other",
    "Název sekce ostatních informací produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.sections.content",
    "Obecný název informační sekce produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.variant_label",
    "Label výběru varianty produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.variant_placeholder",
    "Zástupný text výběru varianty produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.stock.in_stock",
    "Zástupný stav produktu skladem, když katalog neposkytne vlastní label."
  ),
  defineCatalogProductText(
    "catalog.product_detail.stock.out_of_stock",
    "Zástupný stav vyprodaného produktu, když katalog neposkytne vlastní label."
  ),
  defineCatalogProductText(
    "catalog.product_detail.delivery_by",
    "Text očekávaného doručení produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.free_shipping_over",
    "Informace o hranici dopravy zdarma."
  ),
  defineCatalogProductText(
    "catalog.product_detail.gallery.title",
    "Přístupný název galerie produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.gallery.close_aria",
    "Přístupný název akce pro zavření galerie produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.gallery.image_alt",
    "Zástupný alternativní text obrázku v galerii."
  ),
  defineCatalogProductText(
    "catalog.product_detail.gallery.thumbnail_aria",
    "Přístupný název miniatury v galerii produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.advisor.image_alt",
    "Alternativní text fotografie produktového poradce."
  ),
  defineCatalogProductText(
    "catalog.product_detail.advisor.title",
    "Nadpis výzvy ke kontaktování produktového poradce."
  ),
  defineCatalogProductText(
    "catalog.product_detail.advisor.description",
    "Doplňující text produktového poradce."
  ),
  defineCatalogProductText(
    "catalog.product_detail.vip_credit.title",
    "Nadpis informace o VIP kreditu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.vip_credit.earned",
    "Informace o kreditu získaném nákupem."
  ),
  defineCatalogProductText(
    "catalog.product_detail.quantity_aria",
    "Přístupný název pole množství produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.bulk_discount.title",
    "Nadpis a přístupný label množstevní slevy."
  ),
  defineCatalogProductText(
    "catalog.product_detail.bulk_discount.option_title",
    "Název nabídky množstevní slevy."
  ),
  defineCatalogProductText(
    "catalog.product_detail.bulk_discount.per_unit",
    "Cena za kus v nabídce množstevní slevy."
  ),
  defineCatalogProductText(
    "catalog.product_detail.unit_price.per_day",
    "Jednotková cena produktu za den."
  ),
  defineCatalogProductText(
    "catalog.product_detail.unit_price.excluding_vat",
    "Jednotková cena produktu bez DPH."
  ),
  defineCatalogProductText(
    "catalog.product_detail.unit_price.per_unit",
    "Jednotková cena produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.media.doses",
    "Tvar slova dávka podle počtu dávek produktu."
  ),
  defineCatalogProductText(
    "catalog.product_detail.media.daily_capsules",
    "Denní počet kapslí podle množství."
  ),
  defineCatalogProductText(
    "catalog.product_detail.related.also_bought",
    "Nadpis doporučení produktů zakoupených společně."
  ),
  defineCatalogProductText(
    "catalog.product_detail.related.products",
    "Nadpis souvisejících produktů."
  ),
  defineCatalogProductText(
    "catalog.product_detail.related.found",
    "Počet nalezených souvisejících produktů."
  ),
  defineCatalogProductText(
    "catalog.reviews.homepage_title",
    "Nadpis zákaznických hodnocení na souhrnné ploše."
  ),
  defineCatalogProductText(
    "catalog.reviews.product_title",
    "Nadpis hodnocení produktu."
  ),
  defineCatalogProductText(
    "catalog.reviews.tab_label",
    "Label záložky hodnocení produktu."
  ),
  defineCatalogProductText(
    "catalog.reviews.all_reviews",
    "Odkaz na všechna hodnocení produktu."
  ),
  defineCatalogProductText(
    "catalog.reviews.verified_purchase",
    "Označení ověřeného nákupu u recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.verified_customer_badge_alt",
    "Alternativní text odznaku ověřeného zákazníka."
  ),
  defineCatalogProductText(
    "catalog.reviews.rating_aria",
    "Přístupný popis číselného hodnocení."
  ),
  defineCatalogProductText(
    "catalog.reviews.based_on_count",
    "Souhrn počtu hodnocení produktu."
  ),
  defineCatalogProductText(
    "catalog.reviews.loading_aria",
    "Přístupný popis načítání recenzí."
  ),
  defineCatalogProductText(
    "catalog.reviews.unavailable",
    "Stav nedostupných recenzí produktu."
  ),
  defineCatalogProductText(
    "catalog.reviews.load_failed",
    "Chyba při načítání recenzí produktu."
  ),
  defineCatalogProductText(
    "catalog.reviews.retry",
    "Akce pro opakování načtení recenzí."
  ),
  defineCatalogProductText(
    "catalog.reviews.empty_title",
    "Nadpis prázdného stavu recenzí produktu."
  ),
  defineCatalogProductText(
    "catalog.reviews.empty_description",
    "Doplňující text prázdného stavu recenzí produktu."
  ),
  defineCatalogProductText(
    "catalog.reviews.first_action",
    "Akce pro napsání první recenze produktu."
  ),
  defineCatalogProductText(
    "catalog.reviews.refreshing",
    "Stav aktualizace seznamu recenzí."
  ),
  defineCatalogProductText(
    "catalog.reviews.anonymous",
    "Zástupné jméno anonymního autora recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.trust_badges_aria",
    "Sdílený přístupný název seznamu zdrojů hodnocení obchodu."
  ),
  defineCatalogProductText(
    "catalog.reviews.write_action",
    "Akce pro otevření formuláře nové recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.auth_checking",
    "Stav ověřování přihlášení před napsáním recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.sign_in_required",
    "Výzva k přihlášení před napsáním recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.submit_success",
    "Potvrzení úspěšného odeslání recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.close",
    "Akce pro zavření dialogu recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.cancel",
    "Akce pro zrušení psaní recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.submit",
    "Akce pro odeslání recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.submitting",
    "Text akce během odesílání recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.pending_description",
    "Informace o schválení recenze před zveřejněním."
  ),
  defineCatalogProductText(
    "catalog.reviews.dialog_title",
    "Nadpis formuláře nové recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.form.rating_label",
    "Label hodnocení ve formuláři recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.form.rating_validation",
    "Validace povinného hodnocení ve formuláři recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.form.content_min_length_validation",
    "Validace minimální délky textu recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.form.content_min_length_help",
    "Nápověda minimální délky textu recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.form.content_label",
    "Label textu recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.generic",
    "Obecná bezpečná chyba odeslání recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.purchase_required",
    "Chyba recenze vyžadující zakoupený produkt."
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.validation",
    "Obecná validace obsahu recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.rating_required",
    "Chyba chybějícího hodnocení z API recenzí."
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.content_required",
    "Chyba chybějícího textu z API recenzí."
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.title_invalid",
    "Chyba neplatného nadpisu z API recenzí."
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.token_used",
    "Chyba již použitého odkazu na recenzi."
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.token_expired",
    "Chyba expirovaného odkazu na recenzi."
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.token_mismatch",
    "Chyba odkazu na recenzi pro jiný produkt."
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.token_not_found",
    "Chyba neplatného odkazu na recenzi."
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.duplicate",
    "Chyba duplicitního hodnocení produktu."
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.auth_required",
    "Chyba odeslání recenze vyžadující přihlášení."
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.forbidden",
    "Chyba zakázaného odeslání recenze produktu."
  ),
  defineCatalogProductText(
    "catalog.reviews.token.metadata_title",
    "Titulek stránky pro napsání recenze z odkazu."
  ),
  defineCatalogProductText(
    "catalog.reviews.token.back_to_product",
    "Akce pro návrat z recenze na hodnocený produkt."
  ),
  defineCatalogProductText(
    "catalog.reviews.token.back_to_store",
    "Akce pro návrat z recenze do obchodu."
  ),
  defineCatalogProductText(
    "catalog.reviews.token.missing_product",
    "Chyba odkazu na recenzi bez identifikátoru produktu."
  ),
  defineCatalogProductText(
    "catalog.reviews.token.product_loading",
    "Stav načítání hodnoceného produktu."
  ),
  defineCatalogProductText(
    "catalog.reviews.token.product_load_failed",
    "Varování při chybě načtení produktu na stránce recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.token.product_not_found",
    "Varování pro nenalezený produkt na stránce recenze."
  ),
  defineCatalogProductText(
    "catalog.reviews.token.eyebrow",
    "Doplňující nadpis stránky hodnocení nákupu."
  ),
  defineCatalogProductText(
    "catalog.reviews.token.product_label",
    "Label hodnoceného produktu na stránce recenze."
  ),
] as const satisfies readonly StorefrontTextDefinition[]
