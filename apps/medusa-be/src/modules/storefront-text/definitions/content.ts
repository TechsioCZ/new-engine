import type { StorefrontTextDefinition } from "../registry"

type StorefrontContentTextDefinition = Omit<
  StorefrontTextDefinition,
  "namespace"
> & {
  namespace: "content"
}

export const STOREFRONT_CONTENT_TEXT_DEFINITIONS = [
  {
    description: "Obecný odkaz pro zobrazení všech položek v obsahové sekci.",
    key: "content.actions.view_all",
    namespace: "content",
    values: {
      cz: "Zobrazit vše",
      hu: "Összes megtekintése",
      ro: "Vezi toate",
      sk: "Zobraziť všetky",
    },
  },
  {
    description: "Přístupný název odkazu hero banneru.",
    key: "content.home.hero.link_aria",
    namespace: "content",
    values: {
      cz: "{label} - {cta}",
      hu: "{label} - {cta}",
      ro: "{label} - {cta}",
      sk: "{label} - {cta}",
    },
  },
  {
    description: "Výchozí nadpis karuselu nákupu podle účelu.",
    key: "content.home.purpose.title",
    namespace: "content",
    values: {
      cz: "Co vás trápí? Nakupujte podle účelu",
      hu: "Mi aggasztja? Vásároljon cél szerint",
      ro: "Ce vă preocupă? Cumpărați în funcție de scop",
      sk: "Čo vás trápi? Nakupujte podľa účelu",
    },
  },
  {
    description: "Nadpis blogové sekce na domovské stránce.",
    key: "content.home.blog.title",
    namespace: "content",
    values: {
      cz: "Blog o zdraví a kráse",
      hu: "Egészség- és szépségblog",
      ro: "Blog despre sănătate și frumusețe",
      sk: "Blog o zdraví a kráse",
    },
  },
  {
    description: "Nadpis sekce nejprodávanějších produktů na domovské stránce.",
    key: "content.home.product_sections.bestsellers",
    namespace: "content",
    values: {
      cz: "Nejoblíbenější produkty",
      hu: "Legnépszerűbb termékek",
      ro: "Cele mai populare produse",
      sk: "Najobľúbenejšie produkty",
    },
  },
  {
    description: "Nadpis sekce nových produktů na domovské stránce.",
    key: "content.home.product_sections.new_products",
    namespace: "content",
    values: {
      cz: "Novinky",
      hu: "Újdonságok",
      ro: "Noutăți",
      sk: "Novinky",
    },
  },
  {
    description: "Nadpis sekce zlevněných produktů na domovské stránce.",
    key: "content.home.product_sections.sale",
    namespace: "content",
    values: {
      cz: "Aktuálně ve slevě",
      hu: "Aktuális akciók",
      ro: "Produse la reducere",
      sk: "Aktuálne v zľave",
    },
  },
  {
    description: "Claim rychlého doručení v benefitní liště domovské stránky.",
    key: "content.home.benefits.fast_delivery",
    namespace: "content",
    values: {
      cz: "Rychlé doručení až k vám domů.",
      hu: "Gyors szállítás egészen az otthonáig.",
      ro: "Livrare rapidă direct la dumneavoastră acasă.",
      sk: "Rýchle doručenie až k vám domov.",
    },
  },
  {
    description: "Claim garance spokojenosti v benefitní liště domovské stránky.",
    key: "content.home.benefits.satisfaction_guarantee",
    namespace: "content",
    values: {
      cz: "Garance spokojenosti nebo vrácení peněz.",
      hu: "Elégedettségi garancia vagy pénzvisszafizetés.",
      ro: "Garanția satisfacției sau banii înapoi.",
      sk: "Garancia spokojnosti alebo vrátenia peňazí.",
    },
  },
  {
    description: "Claim vlastních produktů v benefitní liště domovské stránky.",
    key: "content.home.benefits.own_products",
    namespace: "content",
    values: {
      cz: "130+ vlastních produktů skladem.",
      hu: "Több mint 130 saját termék raktáron.",
      ro: "Peste 130 de produse proprii în stoc.",
      sk: "130+ vlastných produktov skladom.",
    },
  },
  {
    description: "Claim důvěry zákazníků v benefitní liště domovské stránky.",
    key: "content.home.benefits.trusted_customers",
    namespace: "content",
    values: {
      cz: "Důvěřují nám tisíce zákazníků po celé Evropě.",
      hu: "Vásárlók ezrei bíznak bennünk Európa-szerte.",
      ro: "Mii de clienți din întreaga Europă au încredere în noi.",
      sk: "Dôverujú nám tisíce zákazníkov po celej Európe.",
    },
  },
  {
    description: "Název blogu v drobečkové navigaci.",
    key: "content.pages.blog",
    namespace: "content",
    values: {
      cz: "Blog",
      hu: "Blog",
      ro: "Blog",
      sk: "Blog",
    },
  },
  {
    description: "Název stránky O nás v drobečkové navigaci.",
    key: "content.pages.about",
    namespace: "content",
    values: {
      cz: "O nás",
      hu: "Rólunk",
      ro: "Despre noi",
      sk: "O nás",
    },
  },
  {
    description: "Název FAQ stránky v drobečkové navigaci.",
    key: "content.pages.faq",
    namespace: "content",
    values: {
      cz: "Časté dotazy",
      hu: "Gyakori kérdések",
      ro: "Întrebări frecvente",
      sk: "Časté otázky",
    },
  },
  {
    description: "Odkaz z blogové karty na detail článku.",
    key: "content.blog.card.open_article",
    namespace: "content",
    values: {
      cz: "Přejít na článek",
      hu: "Cikk megnyitása",
      ro: "Citește articolul",
      sk: "Prejsť na článok",
    },
  },
  {
    description: "Odkaz pro načtení další stránky blogových článků.",
    key: "content.blog.pagination.load_more",
    namespace: "content",
    values: {
      cz: "Zobrazit další",
      hu: "Továbbiak megjelenítése",
      ro: "Afișează mai multe",
      sk: "Zobraziť ďalšie",
    },
  },
  {
    description: "Souhrn aktuální a celkové stránky blogu.",
    key: "content.blog.pagination.summary",
    namespace: "content",
    values: {
      cz: "Strana {page}/{totalPages}",
      hu: "{page}/{totalPages}. oldal",
      ro: "Pagina {page}/{totalPages}",
      sk: "Strana {page}/{totalPages}",
    },
  },
  {
    description: "Nadpis sekce dalších blogových článků.",
    key: "content.blog.detail.related_articles",
    namespace: "content",
    values: {
      cz: "Další články",
      hu: "További cikkek",
      ro: "Alte articole",
      sk: "Ďalšie články",
    },
  },
  {
    description: "Popisek autora blogového článku.",
    key: "content.blog.detail.author",
    namespace: "content",
    values: {
      cz: "Autor:",
      hu: "Szerző:",
      ro: "Autor:",
      sk: "Autor:",
    },
  },
  {
    description: "Popisek data publikování blogového článku.",
    key: "content.blog.detail.published",
    namespace: "content",
    values: {
      cz: "Publikováno:",
      hu: "Közzétéve:",
      ro: "Publicat:",
      sk: "Publikované:",
    },
  },
  {
    description: "Popisek doby čtení blogového článku.",
    key: "content.blog.detail.reading_time",
    namespace: "content",
    values: {
      cz: "Doba čtení:",
      hu: "Olvasási idő:",
      ro: "Timp de citire:",
      sk: "Čas čítania:",
    },
  },
  {
    description: "Nadpis kategorií v postranním panelu blogového článku.",
    key: "content.blog.sidebar.categories",
    namespace: "content",
    values: {
      cz: "Kategorie",
      hu: "Kategóriák",
      ro: "Categorii",
      sk: "Kategórie",
    },
  },
  {
    description: "Celkový počet položek na FAQ stránce.",
    key: "content.faq.item_count",
    namespace: "content",
    values: {
      cz: "{count, plural, one {Celkem # položka} few {Celkem # položky} other {Celkem # položek}}",
      hu: "{count, plural, other {Összesen # elem}}",
      ro: "{count, plural, one {# element în total} few {# elemente în total} other {# de elemente în total}}",
      sk: "{count, plural, one {# položka celkom} few {# položky celkom} other {# položiek celkom}}",
    },
  },
  {
    description: "Přístupný popisek hodnocení na stránce O nás.",
    key: "content.about.rating_aria",
    namespace: "content",
    values: {
      cz: "Hodnocení {rating} z {max} hvězdiček",
      hu: "Értékelés: {rating} / {max} csillag",
      ro: "Evaluare de {rating} din {max} stele",
      sk: "Hodnotenie {rating} z {max} hviezdičiek",
    },
  },
] as const satisfies readonly StorefrontContentTextDefinition[]
