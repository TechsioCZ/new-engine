import type {
  Product,
  ProductDetailContentSection,
} from "@/components/product-detail/product-detail.types"
import {
  asBoolean,
  asRecord,
  asString,
} from "@/components/product-detail/utils/value-utils"

const OTHER_SECTION_KEY = "other"

type BrandGpsrLabels = {
  euResponsibleAddress: string
  euResponsibleCompany: string
  euResponsibleEmail: string
  manufacturerAddress: string
  manufacturerCompany: string
  manufacturerEmail: string
  manufacturedOutsideEu: string
  no: string
  yes: string
}

const BRAND_GPSR_LABELS_BY_LANGUAGE: Record<string, BrandGpsrLabels> = {
  cs: {
    euResponsibleAddress: "Adresa odpovědné osoby v EU",
    euResponsibleCompany: "Odpovědná osoba v EU",
    euResponsibleEmail: "E-mail odpovědné osoby v EU",
    manufacturerAddress: "Adresa výrobce",
    manufacturerCompany: "Výrobní společnost",
    manufacturerEmail: "E-mail výrobce",
    manufacturedOutsideEu: "Vyrobeno mimo EU",
    no: "Ne",
    yes: "Ano",
  },
  hu: {
    euResponsibleAddress: "Az EU-s felelős személy címe",
    euResponsibleCompany: "EU-s felelős személy",
    euResponsibleEmail: "Az EU-s felelős személy e-mail-címe",
    manufacturerAddress: "A gyártó címe",
    manufacturerCompany: "Gyártó vállalat",
    manufacturerEmail: "A gyártó e-mail-címe",
    manufacturedOutsideEu: "EU-n kívül gyártva",
    no: "Nem",
    yes: "Igen",
  },
  ro: {
    euResponsibleAddress: "Adresa persoanei responsabile din UE",
    euResponsibleCompany: "Persoana responsabilă din UE",
    euResponsibleEmail: "E-mailul persoanei responsabile din UE",
    manufacturerAddress: "Adresa producătorului",
    manufacturerCompany: "Compania producătoare",
    manufacturerEmail: "E-mailul producătorului",
    manufacturedOutsideEu: "Fabricat în afara UE",
    no: "Nu",
    yes: "Da",
  },
  sk: {
    euResponsibleAddress: "Adresa zodpovednej osoby v EÚ",
    euResponsibleCompany: "Zodpovedná osoba v EÚ",
    euResponsibleEmail: "E-mail zodpovednej osoby v EÚ",
    manufacturerAddress: "Adresa výrobcu",
    manufacturerCompany: "Výrobná spoločnosť",
    manufacturerEmail: "E-mail výrobcu",
    manufacturedOutsideEu: "Vyrobené mimo EÚ",
    no: "Nie",
    yes: "Áno",
  },
}

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")

const resolveBrandGpsrLabels = (locale: string): BrandGpsrLabels => {
  const language = locale.trim().toLowerCase().split("-")[0] ?? ""

  return (
    BRAND_GPSR_LABELS_BY_LANGUAGE[language] ?? BRAND_GPSR_LABELS_BY_LANGUAGE.sk
  )
}

const buildBrandGpsrHtml = (
  product: Product | null,
  locale: string
): string | null => {
  const brand = asRecord(
    (product as (Product & { brand?: unknown }) | null)?.brand
  )
  if (!brand) {
    return null
  }

  const manufacturerCompany = asString(brand.gpsr_manufacturing_company_name)
  const manufacturerAddress = asString(brand.gpsr_postal_address)
  const manufacturerEmail = asString(brand.gpsr_contact_email)
  const manufacturedOutsideEu = asBoolean(brand.gpsr_manufactured_outside_eu)
  const euResponsibleCompany = asString(
    brand.gpsr_european_reseller_manufacturing_company_name
  )
  const euResponsibleAddress = asString(
    brand.gpsr_european_reseller_postal_address
  )
  const euResponsibleEmail = asString(
    brand.gpsr_european_reseller_contact_email
  )

  if (
    ![
      manufacturerCompany,
      manufacturerAddress,
      manufacturerEmail,
      euResponsibleCompany,
      euResponsibleAddress,
      euResponsibleEmail,
    ].some(Boolean)
  ) {
    return null
  }

  const labels = resolveBrandGpsrLabels(locale)
  const rows: [label: string, value: string][] = []
  const addRow = (label: string, value: string | null) => {
    if (value) {
      rows.push([label, value])
    }
  }

  addRow(labels.manufacturerCompany, manufacturerCompany)
  addRow(labels.manufacturerAddress, manufacturerAddress)
  addRow(labels.manufacturerEmail, manufacturerEmail)
  if (manufacturedOutsideEu !== null) {
    addRow(
      labels.manufacturedOutsideEu,
      manufacturedOutsideEu ? labels.yes : labels.no
    )
  }
  addRow(labels.euResponsibleCompany, euResponsibleCompany)
  addRow(labels.euResponsibleAddress, euResponsibleAddress)
  addRow(labels.euResponsibleEmail, euResponsibleEmail)

  return rows
    .map(
      ([label, value]) =>
        `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`
    )
    .join("\n")
}

export const mergeBrandGpsrIntoProductContentSections = (
  sections: ProductDetailContentSection[],
  product: Product | null,
  otherSectionTitle: string,
  locale: string
): ProductDetailContentSection[] => {
  const gpsrHtml = buildBrandGpsrHtml(product, locale)
  if (!gpsrHtml) {
    return sections
  }

  const otherSectionIndex = sections.findIndex(
    (section) => section.key === OTHER_SECTION_KEY
  )

  if (otherSectionIndex === -1) {
    return [
      ...sections,
      {
        key: OTHER_SECTION_KEY,
        title: otherSectionTitle,
        html: gpsrHtml,
      },
    ]
  }

  return sections.map((section, index) =>
    index === otherSectionIndex
      ? {
          ...section,
          html: `${section.html}\n${gpsrHtml}`,
        }
      : section
  )
}
