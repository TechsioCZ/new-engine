import { randomBytes } from "node:crypto"
import { getPayload } from "payload"
import config from "../payload.config"

/**
 * One-off migration: add the missing `ro` localization to Payload `pages`
 * id=12 (FAQ), so the Herbatika RO storefront route `/intrebari-frecvente`
 * (bound via HERBATIKA_CMS_STATIC_PAGE_IDS.faq=12) stops 404ing.
 *
 * Content is migrated verbatim from the already-reviewed Romanian FAQ copy
 * in apps/herbatika/src/components/faq/faq-page.data.ts
 * (`FAQ_PAGE_DATA_BY_LOCALE["ro-RO"]`, the `roFaqItems` array) — no new
 * copy is written or translated here. The lexical richText node shapes
 * (heading/paragraph/link) mirror exactly what the sk/cs/hu locales of the
 * same document already use (verified via inspect-faq-page.ts): every
 * question is an `h2` heading, every body line is its own paragraph node,
 * and every FAQ list item is flattened into its own paragraph (the existing
 * sk/cs/hu content contains zero lexical "list" nodes, so a true list node
 * would be a structural deviation, not a mirror).
 *
 * `title`, `slug`, and `content` are the only localized fields on this
 * collection (see apps/payload/src/lib/constants/fields.ts — status,
 * visibility, category and publishedDate all default `localized: false`),
 * so those are the only fields written here; everything else is left
 * untouched for every locale.
 *
 * Slug `intrebari-frecvente` is the authoritative RO FAQ segment from
 * apps/herbatika/src/lib/url/segment-registry-data.ts
 * (ROUTE_SEGMENT_REGISTRY.ro.staticRootPages.faq).
 *
 * The "Cum deveniți membru al clubului?" answer contains a
 * `{kind:"account", section:"register"}` link (source: FaqLink.target in
 * apps/herbatika/src/components/faq/faq-page.data.ts). Its href is built
 * from the same canonical account/register route every market resolves
 * through `buildPath`/`PUBLIC_FLOW_ROUTE_SEGMENTS`
 * (libs/storefront-i18n/src/core/public-flow-routes.ts):
 * `/${flowRoots.account}/${children.account.register}`. For ro that is
 * `/cont/inregistrare` (flowRoots.account="cont",
 * children.account.register="inregistrare") — verified live (200) via
 * `curl -H 'Host: ro.localhost' http://127.0.0.1:3001/cont/inregistrare`.
 * See RO_ACCOUNT_PATHS below and resolveLinkHref for how it is applied.
 * Inspecting the sk/cs Payload
 * page 12 content directly (inspect-faq-page.ts) showed their existing
 * register links point at bare legacy paths (`/registracia/`,
 * `/registrace/`) that predate this engine's `/ucet/...` route prefix and
 * 404 on it; hu's page 12 content has no register link at all. Those
 * stale hrefs are therefore not mirrored — ro instead gets the canonical,
 * working route, consistent with the no-public-legacy-routes rule for
 * markets without an explicit legacy carve-out
 * (apps/herbatika/src/lib/routing/legacy-official-redirects.ts).
 *
 * Run (dry-run, default): payload run src/scripts/localize-faq-ro.ts
 * Run (apply):      FAQ_RO_APPLY=1 payload run src/scripts/localize-faq-ro.ts
 * Run (force re-apply even if a ro localization already exists):
 *                    FAQ_RO_APPLY=1 FAQ_RO_FORCE=1 payload run src/scripts/localize-faq-ro.ts
 */

const PAGE_ID = 12
const LOCALE = "ro" as const
const SLUG = "intrebari-frecvente"
const TITLE = "Întrebări frecvente"

type FaqLink = {
  href?: string
  label: string
  target?:
    | { kind: "account"; section: "register" }
    | { kind: "static"; page: "returns" | "terms" }
}

type FaqAnswerBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "links"; items: FaqLink[] }

type FaqItem = {
  id: string
  question: string
  answer: FaqAnswerBlock[]
}

// Verbatim copy of FAQ_PAGE_DATA_BY_LOCALE["ro-RO"].items from
// apps/herbatika/src/components/faq/faq-page.data.ts (roFaqItems), text
// content unchanged. `updatedAt` is dropped (no equivalent field on this
// richText document; sk/cs/hu render dates as an inline paragraph line
// instead, which is preserved below).
const roFaqItems: FaqItem[] = [
  {
    id: "stav-objednavky",
    question: "În ce stadiu se află comanda dumneavoastră?",
    answer: [
      { type: "paragraph", text: "24.9.2018" },
      {
        type: "paragraph",
        text: "Doriți să aflați în ce stadiu se află comanda dumneavoastră? Puteți verifica rapid și ușor:",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Autentificați-vă în contul de client.",
          "Selectați opțiunea „Comenzile mele” din partea dreaptă.",
          "Veți vedea un tabel clar cu stadiul comenzii dumneavoastră.",
        ],
      },
      {
        type: "links",
        items: [{ label: "Urmăriți comanda din contul de client" }],
      },
    ],
  },
  {
    id: "vypredany-tovar",
    question: "Doriți să fiți anunțat când un produs epuizat revine în stoc?",
    answer: [
      { type: "paragraph", text: "15.8.2019" },
      {
        type: "paragraph",
        text: "Uneori apar întârzieri în aprovizionarea anumitor produse, mai ales atunci când acestea vin de la furnizori îndepărtați. De aceea primim frecvent întrebări despre data revenirii lor în stoc.",
      },
      {
        type: "paragraph",
        text: "Am pregătit funcția de alertă de stoc, care vă anunță când produsul dorit este din nou disponibil în oferta noastră.",
      },
      {
        type: "paragraph",
        text: "Astfel aflați imediat când produsul a fost reaprovizionat și îl puteți comanda fără să verificați periodic pagina.",
      },
      {
        type: "paragraph",
        text: "Apăsați „Anunțați-mă când revine în stoc”, introduceți adresa de e-mail, iar noi vă vom trimite automat un mesaj după reaprovizionare.",
      },
      { type: "heading", text: "Primul pas" },
      {
        type: "links",
        items: [{ label: "Deschideți alerta de stoc pe pagina produsului" }],
      },
      { type: "heading", text: "Al doilea pas" },
      {
        type: "links",
        items: [{ label: "Introduceți adresa de e-mail și confirmați alerta" }],
      },
    ],
  },
  {
    id: "zlavovy-kupon",
    question: "Nu puteți aplica un cupon de reducere?",
    answer: [
      { type: "paragraph", text: "15.8.2019" },
      {
        type: "paragraph",
        text: "Se întâmplă ca unele cupoane de reducere să nu poată fi aplicate din prima încercare.",
      },
      {
        type: "paragraph",
        text: "Înainte să ne sunați sau să ne scrieți, verificați dacă ați introdus codul exact așa cum a fost primit, fără ghilimele și fără spații suplimentare.",
      },
      {
        type: "paragraph",
        text: "Dacă problema persistă, trimiteți cuponul la salut@herbatica.ro sau adăugați-l în nota pentru comerciant, iar noi îl vom verifica.",
      },
      {
        type: "links",
        items: [
          { href: "mailto:salut@herbatica.ro", label: "salut@herbatica.ro" },
        ],
      },
    ],
  },
  {
    id: "obchodna-ponuka",
    question: "Aveți o propunere de afaceri pentru noi?",
    answer: [
      { type: "paragraph", text: "15.8.2019" },
      {
        type: "paragraph",
        text: "Dacă aveți o propunere comercială, o idee de îmbunătățire sau sunteți interesat de o colaborare ori de achiziții angro, scrieți-ne la salut@herbatica.ro.",
      },
      {
        type: "paragraph",
        text: "Ne puteți contacta și telefonic la +40 (31) 2295431.",
      },
      {
        type: "paragraph",
        text: "Așteptăm cu interes mesajul sau apelul dumneavoastră.",
      },
      {
        type: "links",
        items: [
          { href: "mailto:salut@herbatica.ro", label: "salut@herbatica.ro" },
          { href: "tel:+40312295431", label: "+40 (31) 2295431" },
        ],
      },
    ],
  },
  {
    id: "byt-v-obraze",
    question:
      "Cum puteți fi la curent cu noutățile, schimbările și promoțiile Herbatica?",
    answer: [
      { type: "paragraph", text: "15.8.2019" },
      {
        type: "paragraph",
        text: "Ne bucurăm să avem clienți fideli și să le putem oferi mereu informații utile. Pentru dumneavoastră am pregătit newsletterul Herbatica și paginile noastre de Instagram și Facebook.",
      },
      { type: "heading", text: "Clubul Herbatica" },
      {
        type: "list",
        items: [
          "o listă de prețuri preferențiale individuală, cu avantaje pentru membrii VIP",
          "noutăți și informații regulate din universul Herbatica prin newsletter, inclusiv cupoane atunci când sunt disponibile",
          "pragul pentru transport gratuit este afișat în lei (RON) în coș, conform ofertei în vigoare",
          "aveți la dispoziție 14 zile pentru returnarea produselor, în condițiile prevăzute de politica de retur",
          "cupoanele de reducere primite pot fi folosite conform condițiilor afișate pentru fiecare campanie",
          "comenzile din cont rămân în istoricul dumneavoastră și pot ajuta la identificarea unei achiziții",
        ],
      },
      { type: "heading", text: "Cum deveniți membru al clubului?" },
      {
        type: "list",
        items: [
          "creați-vă un cont",
          "abonați-vă la newsletter pentru a primi noutățile",
        ],
      },
      {
        type: "links",
        items: [
          {
            label: "Înregistrare",
            target: { kind: "account", section: "register" },
          },
          { label: "Newsletter" },
          { href: "https://www.instagram.com/herbatica/", label: "Instagram" },
          {
            href: "https://www.facebook.com/vasaherbatica/",
            label: "Facebook",
          },
        ],
      },
    ],
  },
  {
    id: "kamenna-predajna",
    question: "Doriți să cumpărați personal de la un magazin fizic?",
    answer: [
      { type: "paragraph", text: "15.8.2019" },
      {
        type: "paragraph",
        text: "Informațiile despre punctele de vânzare fizice pot varia în funcție de țară și perioadă.",
      },
      {
        type: "paragraph",
        text: "Pentru opțiunile disponibile clienților din România, contactați echipa Herbatica România.",
      },
      {
        type: "paragraph",
        text: "Ne puteți suna la +40 (31) 2295431 sau ne puteți scrie la salut@herbatica.ro.",
      },
      {
        type: "links",
        items: [
          { href: "tel:+40312295431", label: "+40 (31) 2295431" },
          { href: "mailto:salut@herbatica.ro", label: "salut@herbatica.ro" },
        ],
      },
    ],
  },
  {
    id: "affiliate",
    question: "Doriți să colaborați cu Herbatica în calitate de afiliat?",
    answer: [
      { type: "paragraph", text: "15.8.2019" },
      {
        type: "paragraph",
        text: "Colaborăm cu parteneri afiliați prin platforma Dognet. Vă puteți înregistra pe platformă și ne puteți contacta prin această rețea.",
      },
      {
        type: "paragraph",
        text: "Pentru un alt tip de colaborare, scrieți-ne la salut@herbatica.ro.",
      },
      {
        type: "links",
        items: [
          { href: "https://www.dognet.com/", label: "Dognet" },
          { href: "mailto:salut@herbatica.ro", label: "salut@herbatica.ro" },
        ],
      },
    ],
  },
  {
    id: "eurobio-lab",
    question:
      "Cum se interpretează marcajul termenului de valabilitate pentru produsele EUROBIO LAB?",
    answer: [
      { type: "paragraph", text: "8.3.2021" },
      {
        type: "paragraph",
        text: "Explicațiile privind marcajul termenului de valabilitate al produselor EUROBIO LAB sunt disponibile într-un document explicativ.",
      },
      {
        type: "links",
        items: [
          {
            href: "mailto:salut@herbatica.ro?subject=Document%20EUROBIO%20LAB",
            label: "Solicitați documentul explicativ",
          },
        ],
      },
    ],
  },
  {
    id: "vratenie-reklamacia",
    question:
      "Cum procedați pentru returnarea sau reclamarea unui produs și unde găsiți formularele?",
    answer: [
      { type: "paragraph", text: "12.3.2021" },
      {
        type: "paragraph",
        text: "Satisfacția dumneavoastră este importantă pentru noi și ne străduim să ne facem treaba cât mai bine. Totuși, pot apărea situații care trebuie remediate. În calitate de client, puteți solicita returnarea sau puteți depune o reclamație pentru un produs, în condițiile aplicabile.",
      },
      {
        type: "paragraph",
        text: "Dacă doriți să reclamați un produs, găsiți informațiile și formularul necesar pe pagina dedicată retururilor și reclamațiilor.",
      },
      {
        type: "links",
        items: [
          {
            label: "Formular de reclamație",
            target: { kind: "static", page: "returns" },
          },
        ],
      },
    ],
  },
  {
    id: "odstupenie-od-zmluvy",
    question:
      "Cum vă puteți retrage din contractul de vânzare și unde găsiți formularele?",
    answer: [
      { type: "paragraph", text: "12.3.2021" },
      {
        type: "paragraph",
        text: "Dacă doriți să vă retrageți din contractul de vânzare, documentele disponibile pot fi consultate în termenii și condițiile magazinului.",
      },
      {
        type: "links",
        items: [
          {
            label: "Documente și condiții",
            target: { kind: "static", page: "terms" },
          },
        ],
      },
    ],
  },
]

// Authoritative RO static-page segments from
// apps/herbatika/src/lib/url/segment-registry-data.ts
// (ROUTE_SEGMENT_REGISTRY.ro.staticRootPages). Only the two segments this
// FAQ content actually links to are reproduced here.
const RO_STATIC_PAGE_PATHS: Record<"returns" | "terms", string> = {
  returns: "/retururi",
  terms: "/termeni-si-conditii",
}

// Canonical account/register path for ro, reproduced from
// PUBLIC_FLOW_ROUTE_SEGMENTS.ro in
// libs/storefront-i18n/src/core/public-flow-routes.ts:
// flowRoots.account="cont", children.account.register="inregistrare" ->
// `/${flowRoots.account}/${children.account.register}`. Verified live
// (HTTP 200) against the running dev storefront:
//   curl -H 'Host: ro.localhost' http://127.0.0.1:3001/cont/inregistrare
// This is the only `{kind:"account", section:...}` target this FAQ
// content links to, so only "register" is reproduced here.
const RO_ACCOUNT_PATHS: Record<"register", string> = {
  register: "/cont/inregistrare",
}

// Shape Payload's pages.content richText field expects for lexical nodes;
// keeps buildFaqContent assignable to payload.update's data.content without
// an unchecked cast.
type LexicalNode = Record<string, unknown> & { type: string; version: number }

const textNode = (text: string) => ({
  detail: 0,
  format: 0,
  mode: "normal" as const,
  style: "",
  text,
  type: "text" as const,
  version: 1,
})

const heading = (text: string) => ({
  children: [textNode(text)],
  direction: null,
  format: "",
  indent: 0,
  tag: "h2" as const,
  type: "heading" as const,
  version: 1,
})

const paragraph = (children: LexicalNode[]) => ({
  children,
  direction: null,
  format: "",
  indent: 0,
  textFormat: 0,
  textStyle: "",
  type: "paragraph" as const,
  version: 1,
})

const linkNode = (url: string, label: string, newTab: boolean) => ({
  children: [textNode(label)],
  direction: null,
  fields: { linkType: "custom" as const, newTab, url },
  format: "",
  id: randomBytes(12).toString("hex"),
  indent: 0,
  type: "link" as const,
  version: 3,
})

const resolveLinkHref = (link: FaqLink): string | null => {
  if (link.href) {
    return link.href
  }
  if (link.target?.kind === "static") {
    return RO_STATIC_PAGE_PATHS[link.target.page]
  }
  if (link.target?.kind === "account" && link.target.section === "register") {
    return RO_ACCOUNT_PATHS.register
  }
  return null
}

const EXTERNAL_HTTP_URL_PATTERN = /^https?:\/\//i

const isExternalHttpUrl = (url: string) => EXTERNAL_HTTP_URL_PATTERN.test(url)

const answerBlockToNodes = (block: FaqAnswerBlock): LexicalNode[] => {
  if (block.type === "heading") {
    return [heading(block.text)]
  }
  if (block.type === "paragraph") {
    return [paragraph([textNode(block.text)])]
  }
  if (block.type === "list") {
    return block.items.map((item, index) =>
      paragraph([
        textNode(block.ordered ? `${index + 1}. ${item}` : `– ${item}`),
      ])
    )
  }
  // block.type === "links": each link becomes its own paragraph, mirroring
  // the sk/cs/hu convention observed via inspect-faq-page.ts.
  return block.items.map((link) => {
    const href = resolveLinkHref(link)
    if (!href) {
      return paragraph([textNode(link.label)])
    }
    const newTab = isExternalHttpUrl(href)
    return paragraph([linkNode(href, link.label, newTab)])
  })
}

const buildFaqContent = (items: readonly FaqItem[]) => ({
  root: {
    children: items.flatMap((item, index) => [
      heading(`${index + 1}. ${item.question}`),
      ...item.answer.flatMap(answerBlockToNodes),
    ]),
    direction: null,
    format: "" as const,
    indent: 0,
    type: "root" as const,
    version: 1,
  },
})

const hasRealRoLocalization = (doc: {
  title?: unknown
  slug?: unknown
}): boolean =>
  typeof doc.title === "string" &&
  doc.title.trim().length > 0 &&
  typeof doc.slug === "string" &&
  doc.slug.trim().length > 0

const run = async () => {
  const apply = process.env.FAQ_RO_APPLY === "1"
  // The script normally exits early once a ro localization exists, so a
  // corrected register href (or any other content fix) never re-lands
  // without this. FAQ_RO_FORCE=1 skips the existing-localization guard and
  // rewrites pages id=12 locale=ro unconditionally (still gated by
  // FAQ_RO_APPLY=1 for the actual write). Only the `ro` locale is ever
  // touched — sk/cs/hu are never read for write purposes.
  const force = process.env.FAQ_RO_FORCE === "1"
  const payload = await getPayload({ config })

  try {
    const existing = await payload.findByID({
      collection: "pages",
      id: PAGE_ID,
      depth: 0,
      fallbackLocale: false,
      locale: LOCALE,
      overrideAccess: true,
    })

    if (hasRealRoLocalization(existing) && !force) {
      payload.logger.info(
        `pages id=${PAGE_ID} already has a ro localization (title="${existing.title}", slug="${existing.slug}") — skipping (set FAQ_RO_FORCE=1 to re-apply)`
      )
      return
    }

    const content = buildFaqContent(roFaqItems)
    const summary = {
      contentTopLevelNodes: content.root.children.length,
      slug: SLUG,
      title: TITLE,
    }

    if (!apply) {
      payload.logger.info(
        `DRY RUN (set FAQ_RO_APPLY=1 to apply): would set pages id=${PAGE_ID} locale=ro to ${JSON.stringify(summary)}`
      )
      return
    }

    await payload.update({
      id: PAGE_ID,
      collection: "pages",
      data: { content, slug: SLUG, title: TITLE },
      locale: LOCALE,
      overrideAccess: true,
    })
    payload.logger.info(
      `Applied ro localization to pages id=${PAGE_ID}: ${JSON.stringify(summary)}`
    )
  } finally {
    await payload.destroy()
  }
}

await run()
