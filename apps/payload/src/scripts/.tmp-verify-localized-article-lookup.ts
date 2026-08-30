import { getPayload } from "payload"
import config from "../payload.config"

const payload = await getPayload({ config })
const source = await payload.find({
  collection: "articles",
  locale: "all",
  depth: 0,
  limit: 20,
  pagination: false,
  overrideAccess: true,
})

const candidate = source.docs
  .flatMap((doc) => {
    const titles = doc.title as unknown as Record<string, string>
    const slugs = doc.slug as unknown as Record<string, string>
    return Object.keys(titles ?? {}).map((locale) => ({
      id: doc.id,
      locale,
      title: titles[locale],
      slug: slugs?.[locale],
    }))
  })
  .find((value) => value.title && value.slug)

if (!candidate) {
  throw new Error("No localized article candidate found")
}

const result = await payload.find({
  collection: "articles",
  locale: "all",
  depth: 0,
  where: {
    and: [
      { slug: { equals: candidate.slug } },
      { title: { equals: candidate.title } },
    ],
  },
  limit: 10,
  pagination: false,
  overrideAccess: true,
})

console.log(
  JSON.stringify({
    candidate,
    matchedIds: result.docs.map((doc) => doc.id),
    exactMatch: result.docs.some((doc) => doc.id === candidate.id),
  })
)

if (!result.docs.some((doc) => doc.id === candidate.id)) {
  process.exitCode = 1
}
