import { createHash, randomUUID } from "node:crypto"
import { link, mkdir, open, unlink } from "node:fs/promises"
import { basename, dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { CmsHeroBannerItem } from "@/lib/storefront/cms-hero-carousels"
import {
  HOMEPAGE_HERO_SOURCE_MANIFEST_ENV,
  parseReviewedHomepageHeroManifest,
  type ReviewedHomepageHeroManifest,
} from "@/lib/storefront/homepage-hero-source-manifest.server"
import { canonicalizePopulationValue } from "@/lib/url-registry/population/manifest-primitives"

const APPROVED_AT = "2026-08-21T00:00:00Z"
const APPROVED_BY = "test-only-user-demo-authorization"

const images = {
  care: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=80",
  eco: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
  gifts:
    "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=900&q=80",
  news: "https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=900&q=80",
} as const

const aboutTarget = {
  staticRouteKey: "root:about",
  targetType: "static",
} as const

const banner = (
  value: Omit<CmsHeroBannerItem, "buttonTarget"> & { ctaLabel: string }
): CmsHeroBannerItem => ({ ...value, buttonTarget: aboutTarget })

const bannersByLocale = {
  "cs-CZ": [
    banner({
      badge: "Přírodní péče",
      ctaLabel: "Zjistit více",
      id: "cz-pece-inspirovana-prirodou",
      imageAlt: "Přírodní kosmetika pro každodenní péči",
      imageSrc: images.care,
      subtitle: "Pečlivě vybrané produkty pro každodenní rituál.",
      title: "Péče inspirovaná přírodou",
    }),
    banner({
      badge: "Ekologická domácnost",
      ctaLabel: "Zjistit více",
      id: "cz-odpovedna-domacnost",
      imageAlt: "Světlá kuchyně s odpovědně zvoleným vybavením",
      imageSrc: images.eco,
      subtitle: "Praktické volby pro příjemnější každodenní prostředí.",
      title: "Domov s ohledem na přírodu",
    }),
    banner({
      badge: "Dárky",
      ctaLabel: "Zjistit více",
      id: "cz-darky-pro-radost",
      imageAlt: "Pečlivě připravený dárkový balíček",
      imageSrc: images.gifts,
      subtitle: "Sady připravené s péčí pro vaše blízké.",
      title: "Dárky, které potěší",
    }),
    banner({
      badge: "Novinky",
      ctaLabel: "Zjistit více",
      id: "cz-novinky-z-prirody",
      imageAlt: "Zelené rostliny inspirující výběr Herbatica",
      imageSrc: images.news,
      subtitle: "Pravidelně doplňujeme nové produkty a značky.",
      title: "Novinky ze světa přírody",
    }),
  ],
  "hu-HU": [
    banner({
      badge: "Természetes ápolás",
      ctaLabel: "További információ",
      id: "hu-termeszet-ihlette-apolas",
      imageAlt: "Természetes kozmetikumok a mindennapi ápoláshoz",
      imageSrc: images.care,
      subtitle: "Gondosan válogatott termékek a mindennapi rutinhoz.",
      title: "A természet ihlette ápolás",
    }),
    banner({
      badge: "Környezettudatos otthon",
      ctaLabel: "További információ",
      id: "hu-tudatos-otthon",
      imageAlt: "Világos konyha környezettudatos választásokkal",
      imageSrc: images.eco,
      subtitle:
        "Praktikus választások egy kellemesebb mindennapi környezetért.",
      title: "Otthon, összhangban a természettel",
    }),
    banner({
      badge: "Ajándékok",
      ctaLabel: "További információ",
      id: "hu-oromteli-ajandekok",
      imageAlt: "Gondosan összeállított ajándékcsomag",
      imageSrc: images.gifts,
      subtitle: "Szeretettel összeállított csomagok szeretteinek.",
      title: "Ajándékok, amelyek örömet szereznek",
    }),
    banner({
      badge: "Újdonságok",
      ctaLabel: "További információ",
      id: "hu-ujdonsagok-a-termeszetbol",
      imageAlt: "A Herbatica választékát inspiráló zöld növények",
      imageSrc: images.news,
      subtitle:
        "Folyamatosan új termékekkel és márkákkal bővítjük kínálatunkat.",
      title: "Újdonságok a természet világából",
    }),
  ],
  "ro-RO": [
    banner({
      badge: "Cosmetică naturală",
      ctaLabel: "Află mai multe",
      id: "ro-ingrijire-inspirata-din-natura",
      imageAlt: "Produse de îngrijire inspirate din natură",
      imageSrc: images.care,
      subtitle: "Cosmetice naturale alese pentru ritualul tău zilnic.",
      title: "Îngrijire inspirată din natură",
    }),
    banner({
      badge: "Casă eco",
      ctaLabel: "Află mai multe",
      id: "ro-casa-cu-alegeri-responsabile",
      imageAlt: "Bucătărie luminoasă și prietenoasă cu mediul",
      imageSrc: images.eco,
      subtitle: "Alegeri practice pentru un mediu cotidian mai plăcut.",
      title: "O casă mai curată, cu alegeri responsabile",
    }),
    banner({
      badge: "Cadouri",
      ctaLabel: "Află mai multe",
      id: "ro-cadouri-pentru-bucurie",
      imageAlt: "Cadou pregătit cu grijă pentru cei dragi",
      imageSrc: images.gifts,
      subtitle: "Seturi pregătite cu grijă pentru cei dragi.",
      title: "Cadouri pentru bucurie",
    }),
    banner({
      badge: "Noutăți",
      ctaLabel: "Află mai multe",
      id: "ro-noutati-din-natura",
      imageAlt: "Plante verzi care inspiră selecția Herbatica",
      imageSrc: images.news,
      subtitle: "Descoperă periodic produse și branduri noi.",
      title: "Noutăți din lumea naturii",
    }),
  ],
} as const satisfies Readonly<
  Record<"cs-CZ" | "hu-HU" | "ro-RO", readonly CmsHeroBannerItem[]>
>

const canonicalJson = (value: unknown): string =>
  JSON.stringify(canonicalizePopulationValue(value))

const sha256 = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex")

export const buildReviewedHomepageHeroTestManifest = (): Readonly<{
  envName: typeof HOMEPAGE_HERO_SOURCE_MANIFEST_ENV
  envValue: string
  envValueSha256: string
  manifest: ReviewedHomepageHeroManifest
}> => {
  const manifest = {
    entries: Object.entries(bannersByLocale).map(([locale, banners]) => ({
      banners: [...banners],
      editorialApproval: {
        approvedAt: APPROVED_AT,
        approvedBy: APPROVED_BY,
        reference: `test-only://homepage-hero/${locale}/approval`,
        status: "approved" as const,
      },
      locale,
      source: {
        rawSha256: sha256(canonicalJson(banners)),
        reference: `test-only://homepage-hero/${locale}/source`,
      },
    })),
    schemaVersion: 1 as const,
  }
  const envValue = canonicalJson(manifest)
  return {
    envName: HOMEPAGE_HERO_SOURCE_MANIFEST_ENV,
    envValue,
    envValueSha256: sha256(envValue),
    manifest: parseReviewedHomepageHeroManifest(envValue),
  }
}

const ignoreCleanupError = (_error: unknown): void => {
  // The target is never removed; only the private temporary file is best-effort.
}

export const writeReviewedHomepageHeroTestManifest = async (
  outputPath: string
): Promise<Readonly<{ outputPath: string; sha256: string }>> => {
  const output = resolve(outputPath)
  const parent = dirname(output)
  await mkdir(parent, { mode: 0o700, recursive: true })
  const temporary = resolve(
    parent,
    `.${basename(output)}.${process.pid}.${randomUUID()}.tmp`
  )
  const build = buildReviewedHomepageHeroTestManifest()
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporary, "wx", 0o600)
    await handle.writeFile(build.envValue, "utf8")
    await handle.sync()
    await handle.close()
    handle = undefined
    await link(temporary, output)
  } finally {
    await handle?.close().catch(ignoreCleanupError)
    await unlink(temporary).catch(ignoreCleanupError)
  }
  return { outputPath: output, sha256: build.envValueSha256 }
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isEntrypoint) {
  const outputPath = process.argv[2]
  if (!outputPath) {
    throw new Error(
      "usage: tsx homepage-hero-reviewed-test-manifest.ts <output>"
    )
  }
  writeReviewedHomepageHeroTestManifest(outputPath).then((result) => {
    process.stdout.write(`${JSON.stringify(result)}\n`)
  })
}
