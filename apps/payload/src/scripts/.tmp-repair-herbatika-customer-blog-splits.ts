import { getPayload } from "payload"
import config from "../payload.config"

const mode = process.argv[2] ?? "dry-run"
if (mode !== "dry-run" && mode !== "apply") {
  throw new Error(`Invalid mode: ${mode}`)
}

const splits = [
  {
    group: "article-4c53a5ecc70dc5227194",
    locale: "cs",
    slug: "skoncujte-s-lupy--prozradime-vam-5-ucinnych-tipu",
    title: "Skoncujte s lupy. Prozradíme vám 5 účinných tipů",
    lookupSlug: "skoncujte-s-lupinami--prezradime-vam-5-ucinnych-tipov",
    lookupTitle: "Skoncujte s lupinami. Prezradíme vám 5 účinných tipov.",
  },
  {
    group: "article-e98489c696eedde9ce4d",
    locale: "cs",
    slug:
      "daji-se-geny-oklamat--probudte-skrytou-silu-vaseho-tela-s-epigemic--revolucni-doplnky-stravy",
    title:
      "Dají se geny oklamat? Probuďte skrytou sílu vašeho těla s Epigemic®. Revoluční novinky v nabídce",
    lookupSlug:
      "daju-sa-geny-oklamat--prebudte-skrytu-silu-vasho-tela-s-epigemic--revolucne-doplnky-stravy",
    lookupTitle:
      "Dajú sa gény oklamať? Prebuďte skrytú silu vášho tela s Epigemic®. Revolučné novinky v ponuke.",
  },
  {
    group: "article-64ca134a4497bfa59a01",
    locale: "cs",
    slug:
      "stres--nespavost--uzkosti--objevte-silu-ashwagandhy--pro-klid-tela-i-duse",
    title:
      "Stres, nespavost, úzkosti? Objevte sílu Ashwagandhy: pro klid těla i duše",
    lookupSlug:
      "stres--nespavost--uzkosti--objavte-silu-ashwagandhy--pre-pokoj-tela-aj-duse",
    lookupTitle:
      "Stres, nespavosť, úzkosti? Objavte silu Ashwagandhy: pre pokoj tela aj duše",
  },
  {
    group: "article-9d4911e181d5206d5a70",
    locale: "cs",
    slug:
      "hirudoterapie-a-extrakt-z-pijavice-lekarske--prirodni-reseni-pro-krecove-zily-a-zdrave-nohy",
    title:
      "Hirudoterapie a extrakt z pijavice lékařské: Přírodní řešení pro křečové žíly a zdravé nohy",
    lookupSlug:
      "hirudoterapia-a-extrakt-z-pijavice-lekarskej--prirodne-riesenie-pre-krcove-zily-a-zdrave-nohy",
    lookupTitle:
      "Hirudoterapia a extrakt z pijavice lekárskej: Prírodné riešenie pre kŕčové žily a zdravé nohy",
  },
  {
    group: "article-4562c9802e166e80f447",
    locale: "cs",
    slug:
      "modre-zony-a-dlouhovekost--znate-tajemstvi-dlouheho-a-zdraveho-zivota",
    title:
      "Modré zóny a dlouhověkost: Znáte tajemství dlouhého a zdravého života?",
    lookupSlug:
      "modre-zony-a-dlhovekost--poznate-tajomstvo-dlheho-a-zdraveho-zivota",
    lookupTitle:
      "Modré zóny a dlhovekosť: Poznáte tajomstvo dlhého a zdravého života?",
  },
  {
    group: "article-4c53a5ecc70dc5227194",
    locale: "hu",
    slug: "szuntesse-meg-a-korpasodast--adunk-5-hatekony-tippet",
    title: "Szüntesse meg a korpásodást. Adunk 5 hatékony tippet.",
    lookupSlug: "skoncujte-s-lupinami--prezradime-vam-5-ucinnych-tipov",
    lookupTitle: "Skoncujte s lupinami. Prezradíme vám 5 účinných tipov.",
  },
  {
    group: "article-e98489c696eedde9ce4d",
    locale: "hu",
    slug:
      "be-lehet-e-csapni-a-geneket--ebressze-fel-teste-rejtett-erejet-az-epigemic-segitsegevel--forradalmi-uj-termekek-a-kinalatban",
    title:
      "Be lehet-e csapni a géneket? Ébressze fel teste rejtett erejét az Epigemic® segítségével. Forradalmi új termékek a kínálatban",
    lookupSlug:
      "daju-sa-geny-oklamat--prebudte-skrytu-silu-vasho-tela-s-epigemic--revolucne-doplnky-stravy",
    lookupTitle:
      "Dajú sa gény oklamať? Prebuďte skrytú silu vášho tela s Epigemic®. Revolučné novinky v ponuke.",
  },
  {
    group: "article-64ca134a4497bfa59a01",
    locale: "hu",
    slug:
      "stressz--almatlansag--szorongas--fedezze-fel-az-ashwagandha-erejet--a-test-es-a-lelek-nyugalmaert",
    title:
      "Stressz, álmatlanság, szorongás? Fedezze fel az Ashwagandha erejét: a test és a lélek nyugalmáért",
    lookupSlug:
      "stres--nespavost--uzkosti--objavte-silu-ashwagandhy--pre-pokoj-tela-aj-duse",
    lookupTitle:
      "Stres, nespavosť, úzkosti? Objavte silu Ashwagandhy: pre pokoj tela aj duše",
  },
  {
    group: "article-4562c9802e166e80f447",
    locale: "hu",
    slug:
      "kek-zonak-es-hosszu-elet--ismeri-a-hosszu-es-egeszseges-elet-titkat",
    title:
      "Kék zónák és hosszú élet: ismeri a hosszú és egészséges élet titkát?",
    lookupSlug:
      "modre-zony-a-dlhovekost--poznate-tajomstvo-dlheho-a-zdraveho-zivota",
    lookupTitle:
      "Modré zóny a dlhovekosť: Poznáte tajomstvo dlhého a zdravého života?",
  },
] as const

const payload = await getPayload({ config })

const findExact = async (slug: string, title: string) => {
  const result = await payload.find({
    collection: "articles",
    locale: "all",
    depth: 0,
    limit: 2,
    pagination: false,
    overrideAccess: true,
    where: { and: [{ slug: { equals: slug } }, { title: { equals: title } }] },
  })
  if (result.docs.length !== 1) {
    throw new Error(
      `Expected one exact article for ${slug}, found ${result.docs.length}`
    )
  }
  return result.docs[0]
}

const checked: Array<{
  group: string
  locale: string
  orphanId: number
  targetId: number
}> = []

for (const split of splits) {
  const orphan = await findExact(split.slug, split.title)
  const target = await findExact(split.lookupSlug, split.lookupTitle)
  if (orphan.id === target.id) {
    throw new Error(`Split already converged for ${split.group}/${split.locale}`)
  }

  const titles = orphan.title as unknown as Record<string, string>
  const slugs = orphan.slug as unknown as Record<string, string>
  const titleLocales = Object.keys(titles ?? {}).filter((locale) => titles[locale])
  const slugLocales = Object.keys(slugs ?? {}).filter((locale) => slugs[locale])
  if (
    titleLocales.length !== 1 ||
    slugLocales.length !== 1 ||
    titleLocales[0] !== split.locale ||
    slugLocales[0] !== split.locale ||
    titles[split.locale] !== split.title ||
    slugs[split.locale] !== split.slug
  ) {
    throw new Error(
      `Orphan ${orphan.id} contains unexpected localized values for ${split.group}`
    )
  }

  checked.push({
    group: split.group,
    locale: split.locale,
    orphanId: orphan.id as number,
    targetId: target.id as number,
  })
}

const orphanIds = new Set(checked.map(({ orphanId }) => orphanId))
if (orphanIds.size !== checked.length) {
  throw new Error("One orphan document matched multiple split variants")
}

console.log(JSON.stringify({ mode, checked }, null, 2))

if (mode === "apply") {
  for (const { orphanId } of checked) {
    await payload.delete({
      collection: "articles",
      id: orphanId,
      overrideAccess: true,
    })
  }
  console.log(JSON.stringify({ deleted: Array.from(orphanIds) }))
}

await payload.destroy()
