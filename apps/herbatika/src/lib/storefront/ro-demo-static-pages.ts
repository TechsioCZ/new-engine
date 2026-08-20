import type { CmsFooterNavigation, CmsPage } from "@/lib/storefront/cms-types"
import type { HerbatikaLocale } from "@/lib/storefront/market-context"
import { buildPath } from "@/lib/url/public-url"
import type { StaticRootPageKey } from "@/lib/url/types"

export const RO_DEMO_APPROVAL_MARKER = "demo-generated-unreviewed"

const OFFICIAL_ORIGIN = "https://www.herbatica.ro"
const CONTACT_EMAIL = "salut@herbatica.ro"

const demoContent = ({
  body,
  officialPath,
}: {
  body: string
  officialPath?: string
}) => `
  <p><strong>Conținut demonstrativ neaprobat.</strong> Această pagină este pregătită pentru demonstrația în limba română și trebuie revizuită de client înainte de publicarea comercială.</p>
  ${body}
  ${
    officialPath
      ? `<p>Pentru informația publicată în prezent, consultați <a href="${OFFICIAL_ORIGIN}${officialPath}">pagina oficială Herbatica România</a>.</p>`
      : ""
  }
`

const RO_DEMO_STATIC_PAGES = {
  affiliate: {
    title: "Program de afiliere",
    description:
      "Prezentare demonstrativă a viitorului program de afiliere Herbatica România.",
    content: demoContent({
      body: `<p>Pregătim o prezentare pentru partenerii interesați de promovarea Herbatica România. Modelul de colaborare, eligibilitatea, comisioanele și regulile programului nu sunt încă aprobate.</p><p>Pentru o discuție preliminară, scrieți la <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>`,
    }),
  },
  contact: {
    title: "Contact",
    description: "Date de contact pentru Herbatica România.",
    content: demoContent({
      body: `<p>Suntem aici pentru întrebări despre produse, comenzi și colaborări.</p><ul><li>E-mail: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></li><li>Telefon: <a href="tel:+40312295431">+40 (31) 229 54 31</a></li></ul>`,
      officialPath: "/",
    }),
  },
  cookies: {
    title: "Politica privind cookie-urile",
    description:
      "Punct de acces demonstrativ la informațiile despre cookie-uri.",
    content: demoContent({
      body: "<p>Textul juridic complet privind cookie-urile nu este inclus în această demonstrație. Preferințele se gestionează prin panoul de cookie-uri al site-ului, iar versiunea juridică finală trebuie furnizată și aprobată de client.</p>",
      officialPath: "/",
    }),
  },
  dropshipping: {
    title: "Dropshipping",
    description:
      "Prezentare demonstrativă a opțiunilor de colaborare dropshipping.",
    content: demoContent({
      body: `<p>Această zonă demonstrează cum poate fi prezentată o colaborare dropshipping. Disponibilitatea, integrarea, sortimentul și condițiile comerciale nu sunt încă aprobate.</p><p>Pentru o discuție preliminară, scrieți la <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>`,
    }),
  },
  giftVoucher: {
    title: "Voucher cadou",
    description: "Prezentare demonstrativă a voucherelor cadou Herbatica.",
    content: demoContent({
      body: "<p>În această demonstrație prezentăm un punct de intrare pentru voucherele cadou. Valorile, disponibilitatea, perioada de valabilitate și condițiile de utilizare trebuie preluate din catalogul aprobat.</p>",
      officialPath: "/cadouri/",
    }),
  },
  privacy: {
    title: "Politica de confidențialitate",
    description:
      "Punct de acces demonstrativ la politica de confidențialitate Herbatica România.",
    content: demoContent({
      body: "<p>Textul juridic nu este reprodus în această demonstrație pentru a evita afișarea unei versiuni neverificate sau depășite.</p>",
      officialPath:
        "/declaratie-privind-protectia-datelor-cu-caracter-personal/",
    }),
  },
  privateLabel: {
    title: "Marcă proprie",
    description:
      "Prezentare demonstrativă pentru colaborări de tip marcă proprie.",
    content: demoContent({
      body: `<p>Această pagină demonstrează spațiul pentru o viitoare ofertă de marcă proprie. Portofoliul, volumele, certificările și condițiile contractuale nu sunt încă aprobate.</p><p>Pentru o discuție preliminară, scrieți la <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>`,
    }),
  },
  returns: {
    title: "Retururi și reclamații",
    description: "Punct de acces demonstrativ pentru retururi și reclamații.",
    content: demoContent({
      body: `<p>Condițiile juridice de retragere, retur și reclamație nu sunt reproduse aici. Pentru situația dvs. concretă, folosiți documentele oficiale în vigoare sau scrieți la <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>`,
      officialPath: "/termeni-si-conditii/",
    }),
  },
  shipping: {
    title: "Transport și plată",
    description:
      "Punct de acces demonstrativ la informațiile despre transport și plată.",
    content: demoContent({
      body: "<p>Metodele, tarifele, pragurile și termenele afișate în checkout trebuie să provină din configurația comercială aprobată. Această demonstrație nu stabilește condiții contractuale de livrare sau plată.</p>",
      officialPath: "/transportul-si-plata/",
    }),
  },
  terms: {
    title: "Termeni și condiții",
    description:
      "Punct de acces demonstrativ la termenii și condițiile Herbatica România.",
    content: demoContent({
      body: "<p>Textul juridic nu este reprodus în această demonstrație pentru a evita afișarea unei versiuni neverificate sau depășite.</p>",
      officialPath: "/termeni-si-conditii/",
    }),
  },
  wholesale: {
    title: "Vânzare en-gros",
    description:
      "Prezentare demonstrativă pentru partenerii en-gros Herbatica România.",
    content: demoContent({
      body: `<p>Această pagină demonstrează spațiul pentru viitoarea ofertă B2B. Sortimentul, volumele minime, prețurile și condițiile contractuale nu sunt încă aprobate.</p><p>Pentru o discuție preliminară, scrieți la <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>`,
    }),
  },
} as const satisfies Partial<
  Record<
    StaticRootPageKey,
    Readonly<{ content: string; description: string; title: string }>
  >
>

export const getRoDemoStaticPage = (
  pageKey: StaticRootPageKey,
  locale: HerbatikaLocale
): CmsPage | null => {
  if (locale !== "ro-RO") {
    return null
  }
  const page =
    RO_DEMO_STATIC_PAGES[pageKey as keyof typeof RO_DEMO_STATIC_PAGES]
  if (!page) {
    return null
  }
  return {
    content: page.content.trim(),
    id: `${RO_DEMO_APPROVAL_MARKER}:ro:${pageKey}`,
    meta: {
      description: page.description,
      title: page.title,
    },
    title: page.title,
  }
}

export const isRoDemoStaticPage = (page: CmsPage) =>
  String(page.id).startsWith(`${RO_DEMO_APPROVAL_MARKER}:ro:`)

export const getRoDemoFooterNavigation = (
  locale: HerbatikaLocale
): CmsFooterNavigation | null =>
  locale === "ro-RO"
    ? {
        columns: [
          {
            items: [
              {
                href: buildPath({ kind: "static", page: "about" }, "ro"),
                slot: "about",
                type: "internal",
              },
              {
                href: buildPath({ kind: "static", page: "faq" }, "ro"),
                slot: "faq",
                type: "internal",
              },
              {
                href: buildPath({ kind: "static", page: "giftVoucher" }, "ro"),
                slot: "gift_voucher",
                type: "internal",
              },
            ],
            slot: "information",
          },
          {
            items: [
              {
                href: buildPath({ kind: "static", page: "shipping" }, "ro"),
                slot: "shipping_payment",
                type: "internal",
              },
              {
                href: buildPath({ kind: "static", page: "returns" }, "ro"),
                slot: "claims_returns",
                type: "internal",
              },
              {
                href: buildPath({ kind: "static", page: "terms" }, "ro"),
                slot: "terms",
                type: "internal",
              },
              {
                href: buildPath({ kind: "static", page: "privacy" }, "ro"),
                slot: "privacy",
                type: "internal",
              },
              {
                href: buildPath({ kind: "static", page: "cookies" }, "ro"),
                slot: "cookies",
                type: "internal",
              },
            ],
            slot: "important",
          },
          {
            items: [
              {
                href: buildPath({ kind: "static", page: "affiliate" }, "ro"),
                slot: "affiliate",
                type: "internal",
              },
              {
                href: buildPath({ kind: "static", page: "wholesale" }, "ro"),
                slot: "wholesale",
                type: "internal",
              },
              {
                href: buildPath({ kind: "static", page: "dropshipping" }, "ro"),
                slot: "dropshipping",
                type: "internal",
              },
              {
                href: buildPath({ kind: "static", page: "privateLabel" }, "ro"),
                slot: "private_label",
                type: "internal",
              },
            ],
            slot: "partners",
          },
        ],
      }
    : null
