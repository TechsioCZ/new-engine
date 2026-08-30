import { getPayload } from "payload"
import config from "../payload.config"

const expected = new Map<number, Readonly<Record<string, string>>>([
  [
    1,
    {
      cs: "welcome-to-payload-cms",
      hu: "welcome-to-payload-cms",
      ro: "welcome-to-payload-cms",
      sk: "welcome-to-payload-cms",
    },
  ],
  [2, { cs: "produkt-fixture-main" }],
  [3, { cs: "produkt-fixture-related" }],
  [4, { cs: "produkt-fixture-alt" }],
  [5, { cs: "produkt-fixture-hidden" }],
  [
    6,
    {
      cs: "rakytnik-vitaminova-bomba-pro-imunitu",
      hu: "homoktovis-vitaminbomba-az-immunrendszernek",
      ro: "catina-alba-bomba-de-vitamine-pentru-imunitate",
      sk: "rakytnik-vitaminova-bomba-pre-imunitu",
    },
  ],
  [
    7,
    {
      cs: "bylinkove-caje-pro-klidny-spanek",
      hu: "gyogynovenyteak-a-nyugodt-alvasert",
      ro: "ceaiuri-din-plante-pentru-un-somn-linistit",
      sk: "bylinkove-caje-na-pokojny-spanok",
    },
  ],
  [
    8,
    {
      cs: "olej-z-cernuchy-sete-tradice-stara-tisice-let",
      hu: "feketekomeny-olaj-tobb-ezer-eves-hagyomany",
      ro: "uleiul-de-chimen-negru-o-traditie-veche-de-mii-de-ani",
      sk: "olej-z-ciernej-rasce-tradicia-stara-tisice-rokov",
    },
  ],
])

const payload = await getPayload({ config })

try {
  const source = await payload.find({
    collection: "articles",
    locale: "all",
    depth: 0,
    limit: 20,
    pagination: false,
    overrideAccess: true,
    where: { id: { in: [...expected.keys()] } },
  })
  if (source.docs.length !== expected.size) {
    throw new Error(
      `Expected ${expected.size} demo articles, found ${source.docs.length}`
    )
  }

  for (const doc of source.docs) {
    const id = doc.id as number
    const expectedSlugs = expected.get(id)
    if (!expectedSlugs) {
      throw new Error(`Unexpected article ID ${id}`)
    }
    const actualSlugs = doc.slug as unknown as Record<string, string>
    const actual = Object.entries(actualSlugs ?? {})
      .filter(([, slug]) => Boolean(slug))
      .sort(([left], [right]) => left.localeCompare(right))
    const expectedEntries = Object.entries(expectedSlugs).sort(
      ([left], [right]) => left.localeCompare(right)
    )
    if (JSON.stringify(actual) !== JSON.stringify(expectedEntries)) {
      throw new Error(`Demo article ${id} localized slugs differ`)
    }
  }

  for (const id of expected.keys()) {
    await payload.delete({
      collection: "articles",
      id,
      overrideAccess: true,
    })
  }

  process.stdout.write(`${JSON.stringify({ deleted: [...expected.keys()] })}\n`)
} finally {
  await payload.destroy()
}
