import {
  fetchCmsJson,
  rewriteCmsHtmlMediaUrls,
  stripCmsHtml,
} from "./cms-client";
import type { CmsPage } from "./cms-types";

type CmsPageResponse = {
  page?: CmsPage | null;
};

const trimString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const cmsFallbackCategory = {
  id: "informacie",
  slug: "informacie",
  title: "Informácie",
} satisfies CmsPage["category"];

const createFallbackPage = ({
  content,
  description,
  slug,
  title,
}: {
  content: string;
  description: string;
  slug: string;
  title: string;
}): CmsPage => ({
  category: cmsFallbackCategory,
  content,
  id: `fallback-${slug}`,
  meta: {
    description,
    title,
  },
  slug,
  title,
});

const fallbackPagesBySlug: Record<string, CmsPage> = {
  "doprava-a-platby": createFallbackPage({
    slug: "doprava-a-platby",
    title: "Doprava a platby",
    description: "Základné informácie o doprave a platbách v Herbatica.",
    content: `
      <p>Dostupné možnosti dopravy a platby sa zobrazia v pokladni podľa krajiny doručenia, obsahu košíka a aktuálnej dostupnosti dopravcov.</p>
      <p>Finálnu cenu dopravy, dobierky a platobných metód uvidíte vždy v rekapitulácii objednávky pred jej odoslaním.</p>
      <p>Ak potrebujete poradiť s doručením alebo platbou, kontaktujte nás na <a href="mailto:ahoj@herbatica.sk">ahoj@herbatica.sk</a>.</p>
    `,
  }),
  "reklamacia-a-vratenie": createFallbackPage({
    slug: "reklamacia-a-vratenie",
    title: "Reklamácia a vrátenie",
    description: "Postup pri reklamácii a vrátení tovaru.",
    content: `
      <p>Ak s objednávkou niečo nie je v poriadku, ozvite sa nám čo najskôr a pripravíme ďalší postup.</p>
      <p>Pri vrátení alebo reklamácii nám pomôže číslo objednávky, kontaktné údaje a stručný popis situácie.</p>
      <p>Podrobnejší postup nájdete aj v časti <a href="/faq#vratenie-reklamacia">Časté otázky - reklamácia a vrátenie</a>.</p>
    `,
  }),
  "obchodne-podmienky": createFallbackPage({
    slug: "obchodne-podmienky",
    title: "Obchodné podmienky",
    description: "Obchodné podmienky e-shopu Herbatica.",
    content: `
      <p>Obchodné podmienky upravujú nákup tovaru v e-shope Herbatica, spôsob uzatvorenia objednávky, platobné a dodacie podmienky, reklamácie a práva zákazníka.</p>
      <p>Pred odoslaním objednávky si v rekapitulácii skontrolujte vybraný tovar, kontaktné údaje, spôsob dopravy a platby.</p>
      <p>V prípade otázok k nákupu alebo obchodným podmienkam kontaktujte zákaznícku podporu na <a href="mailto:ahoj@herbatica.sk">ahoj@herbatica.sk</a>.</p>
    `,
  }),
  "ochrana-osobnych-udajov": createFallbackPage({
    slug: "ochrana-osobnych-udajov",
    title: "Ochrana osobných údajov",
    description: "Informácie o ochrane osobných údajov.",
    content: `
      <p>Osobné údaje spracúvame najmä na vybavenie objednávok, doručenie tovaru, komunikáciu so zákazníkom a plnenie zákonných povinností.</p>
      <p>K údajom pristupujú len osoby a služby, ktoré ich potrebujú na zabezpečenie nákupu, dopravy, platby alebo zákazníckej podpory.</p>
      <p>Otázky k spracúvaniu osobných údajov smerujte na <a href="mailto:ahoj@herbatica.sk">ahoj@herbatica.sk</a>.</p>
    `,
  }),
  cookies: createFallbackPage({
    slug: "cookies",
    title: "Cookies",
    description: "Informácie o používaní cookies.",
    content: `
      <p>Cookies pomáhajú zabezpečiť správne fungovanie e-shopu, zapamätanie základných nastavení, meranie návštevnosti a zlepšovanie služieb.</p>
      <p>Niektoré cookies sú potrebné na fungovanie stránky a nákupného procesu, iné používame len v rozsahu povolenom zákazníkom.</p>
      <p>Ak potrebujete upraviť svoj súhlas alebo získať viac informácií, kontaktujte nás na <a href="mailto:ahoj@herbatica.sk">ahoj@herbatica.sk</a>.</p>
    `,
  }),
  affiliate: createFallbackPage({
    slug: "affiliate",
    title: "Affiliate program",
    description: "Informácie o affiliate spolupráci s Herbatica.",
    content: `
      <p>Herbatica môže spolupracovať s affiliate partnermi cez partnerské siete a individuálne dohody.</p>
      <p>Ak máte záujem o spoluprácu, napíšte nám na <a href="mailto:ahoj@herbatica.sk">ahoj@herbatica.sk</a>.</p>
      <p>Krátke informácie nájdete aj v časti <a href="/faq#affiliate">Časté otázky - affiliate</a>.</p>
    `,
  }),
  velkoobchod: createFallbackPage({
    slug: "velkoobchod",
    title: "Veľkoobchod",
    description: "Informácie o veľkoobchodnej spolupráci.",
    content: `
      <p>Pre veľkoobchodnú spoluprácu, obchodné ponuky alebo návrhy na spoločný rast nás kontaktujte e-mailom.</p>
      <p>Napísať môžete na <a href="mailto:lenka@herbatica.sk">lenka@herbatica.sk</a> alebo zavolať na <a href="tel:+421948426280">00421 948 426 280</a>.</p>
      <p>Podobné informácie nájdete aj v časti <a href="/faq#obchodna-ponuka">Časté otázky - obchodná ponuka</a>.</p>
    `,
  }),
  dropshipping: createFallbackPage({
    slug: "dropshipping",
    title: "Dropshipping",
    description: "Informácie o dropshippingovej spolupráci.",
    content: `
      <p>Ak máte záujem o dropshippingovú spoluprácu s Herbatica, pošlite nám stručné predstavenie projektu a očakávaný model spolupráce.</p>
      <p>Kontaktujte nás na <a href="mailto:ahoj@herbatica.sk">ahoj@herbatica.sk</a>. Ozveme sa s ďalším postupom.</p>
    `,
  }),
  "private-label": createFallbackPage({
    slug: "private-label",
    title: "Private label",
    description: "Informácie o private label spolupráci.",
    content: `
      <p>Pre otázky k private label spolupráci nám pošlite základné informácie o sortimente, objeme a cieľovom trhu.</p>
      <p>Kontaktujte nás na <a href="mailto:ahoj@herbatica.sk">ahoj@herbatica.sk</a>. Po preverení možností sa vám ozveme.</p>
    `,
  }),
};

const notFoundPattern =
  /(?:^|\b)(404|not found|nenaš|nenas|stránka sa nenašla|stranka sa nenasla)(?:\b|$)/i;

const isUsableCmsPage = (page: CmsPage | null | undefined): page is CmsPage => {
  if (!page) {
    return false;
  }

  const pageSlug = trimString(page?.slug);
  const pageTitle = trimString(page?.title);

  if (!pageSlug || !pageTitle) {
    return false;
  }

  const contentText = stripCmsHtml(page.content);
  const combinedText = `${pageTitle} ${contentText}`;

  return Boolean(contentText) && !notFoundPattern.test(combinedText);
};

export const fetchCmsPageBySlug = async (slug: string) => {
  const response = await fetchCmsJson<CmsPageResponse>(
    `pages/${encodeURIComponent(slug)}`,
  );
  const page = response?.page;

  if (!isUsableCmsPage(page)) {
    return fallbackPagesBySlug[slug] ?? null;
  }

  return {
    ...page,
    content: rewriteCmsHtmlMediaUrls(page.content ?? ""),
    meta: page.meta ?? page.seo ?? null,
    slug: trimString(page.slug),
    title: trimString(page.title),
  };
};
