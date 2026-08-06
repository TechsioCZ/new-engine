import BLOG_BANNER from "@/assets/blog-banner.webp"

export type BlogTopicKey = "all" | "fitness" | "krasa" | "zdravie"

interface BlogPostSection {
  title: string
  paragraphs: string[]
  bulletPoints?: string[]
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  contentHtml?: string
  imageSrc: string
  topic: Exclude<BlogTopicKey, "all">
  tags: string[]
  publishedAt: string
  author: string
  authorRole: string
  authorBio: string
  authorImageSrc: string
  readingTime: string
  lead: string
  bulletPoints: string[]
  sections: BlogPostSection[]
}

interface BlogRecommendedProductsConfig {
  categoryHandles: string[]
  limit?: number
}

export interface BlogTopicFilter {
  key: BlogTopicKey
  label: string
  count: number
}

export interface ResolveBlogListingInput {
  posts?: BlogPost[]
  topic?: BlogTopicKey
  page?: number
  pageSize?: number
}

const BLOG_PAGE_SIZE = 12

const BLOG_AUTHOR_ROLE = "Článok pre vás pripravila"
const EDITORIAL_AUTHOR = "Herbatika redakcia"
const EDITORIAL_AUTHOR_BIO =
  "Redakčný tím Herbatika pripravuje odborný obsah o zdraví, výžive a prírodnej starostlivosti."
const EDITORIAL_AUTHOR_IMAGE =
  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=320&q=80"
const MONIKA_AUTHOR = "Monika Kováčová"
const MONIKA_AUTHOR_BIO =
  "Špecializujem sa na prírodnú kozmetiku, citlivú pokožku a funkčné zloženia bez kompromisov."
const MONIKA_AUTHOR_IMAGE =
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=320&q=80"
const HERBAL_EXTRACTS_CATEGORY_HANDLE = "doplnky-vyzivy-bylinne-extrakty"

const BLOG_TOPIC_ONLY_FILTERS: {
  key: Exclude<BlogTopicKey, "all">
  label: string
}[] = [
  { key: "fitness", label: "Fitness" },
  { key: "krasa", label: "Krása" },
  { key: "zdravie", label: "Zdravie" },
]

export const BLOG_PROMO_BANNER = {
  codeLabel: "KÓD:",
  codeValue: "TOP20",
  imageSrc: BLOG_BANNER,
  subtitle: "na bestsellery",
  title: "ZĽAVA 20 %",
}

const HERBATIKA_BLOG_POSTS: BlogPost[] = [
  {
    author: "Karina Daráková",
    authorBio:
      "Vyštudovala som žurnalistiku a popri redakčnej práci sa venujem aj copywritingu. Pochádzam spod Tatier a milujem cestovanie, hudbu, dobré knihy a beh.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=320&q=80",
    authorRole: BLOG_AUTHOR_ROLE,
    bulletPoints: [
      "hydratačný režim a dopĺňanie minerálov plánujte počas celého dňa",
      "kombinujte horčík, draslík a sodík podľa záťaže, nie nárazovo",
      "pri aktívnom pohybe doplňte aj kolagén, vitamín C a omega-3",
    ],
    excerpt:
      "Ako podporiť regeneráciu pohybového aparátu, doplniť minerály a zlepšiť každodennú vitalitu bez zbytočných extrémov.",
    id: "blog-1",
    imageSrc:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
    lead: "Elektrolyty predstavujú skupinu minerálov, ktoré nesú elektrický náboj a zabezpečujú množstvo nevyhnutných funkcií v ľudskom tele.",
    publishedAt: "2025-12-06",
    readingTime: "9 min",
    sections: [
      {
        paragraphs: [
          "Elektrolyty pomáhajú regulovať svalové kontrakcie, nervové impulzy aj hydratáciu buniek. Pri ich poklese telo funguje menej efektívne a to sa prejaví na výkone aj regenerácii.",
          "V bežnom živote k stratám dochádza najmä počas stresu, fyzickej záťaže alebo pri nedostatočnom pitnom režime.",
        ],
        title: "Čo sú elektrolyty a prečo sú nevyhnutné",
      },
      {
        bulletPoints: [
          "sodík: udržiavanie hydratácie a krvného tlaku",
          "draslík: funkcia svalov a nervových impulzov",
          "horčík: regenerácia, únava a svalové kŕče",
        ],
        paragraphs: [
          "Sodík a draslík ovplyvňujú rovnováhu tekutín, horčík podporuje svalovú a nervovú sústavu a vápnik je dôležitý pre kontrakciu svalov.",
          "Pri dlhšej fyzickej aktivite má význam dopĺňať elektrolyty priebežne, nie až po výkone.",
        ],
        title: "Najdôležitejšie elektrolyty a ich úlohy",
      },
      {
        paragraphs: [
          "Organizmus priebežne reguluje hladiny elektrolytov cez obličky, hormóny a príjem tekutín. Dlhodobý deficit sa prejaví poklesom energie aj výkonnosti.",
        ],
        title: "Mechanizmus regulácie elektrolytov v tele",
      },
      {
        paragraphs: [
          "Nerovnováha môže viesť k únave, svalovým kŕčom, bolestiam hlavy alebo zníženej tolerancii záťaže. Včasné doplnenie je jednoduchý krok s veľkým efektom.",
        ],
        title: "Dôsledky nerovnováhy elektrolytov",
      },
      {
        paragraphs: [
          "Základ je konzistentnosť: pravidelný príjem tekutín, minerálov a kvalitná strava bohatá na zeleninu, bielkoviny a zdravé tuky.",
          "Pri zvýšenej záťaži má význam zaradiť cielene výživové doplnky s overeným zložením a jasným dávkovaním.",
        ],
        title: "Ako nastaviť praktický režim",
      },
    ],
    slug: "elektrolyty-klucove-mineraly-pre-spravne-fungovanie-tela",
    tags: ["Fitness", "Krása"],
    title: "Elektrolyty: kľúčové minerály pre správne fungovanie tela",
    topic: "zdravie",
  },
  {
    author: EDITORIAL_AUTHOR,
    authorBio: EDITORIAL_AUTHOR_BIO,
    authorImageSrc: EDITORIAL_AUTHOR_IMAGE,
    authorRole: BLOG_AUTHOR_ROLE,
    bulletPoints: [
      "ashwagandha je vhodná pri napätí a zhoršenom spánku",
      "podporuje regeneráciu po záťaži",
      "účinky sledujte minimálne 3 až 4 týždne",
    ],
    excerpt:
      "Ashwagandha patrí medzi prírodné adaptogény a vyniká priaznivými účinkami na telo aj myseľ.",
    id: "blog-2",
    imageSrc:
      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=1200&q=80",
    lead: "Adaptogény podporujú odolnosť organizmu voči fyzickému aj psychickému stresu. Dôležité je správne dávkovanie a načasovanie.",
    publishedAt: "2025-12-05",
    readingTime: "9 min",
    sections: [
      {
        paragraphs: [
          "Pri dlhodobom strese, horšej kvalite spánku alebo psychickom vyčerpaní môže byť ashwagandha vhodnou súčasťou denného režimu.",
        ],
        title: "Kedy ashwagandhu zaradiť",
      },
    ],
    slug: "ashwagandha-adaptogen-pre-rovnovahu-tela-a-mysle",
    tags: ["Fitness"],
    title: "Ashwagandha: adaptogén pre rovnováhu tela a mysle",
    topic: "fitness",
  },
  {
    author: EDITORIAL_AUTHOR,
    authorBio: EDITORIAL_AUTHOR_BIO,
    authorImageSrc: EDITORIAL_AUTHOR_IMAGE,
    authorRole: BLOG_AUTHOR_ROLE,
    bulletPoints: [
      "rhodiola podporuje energiu a koncentráciu",
      "ženšen pomáha pri únave",
      "pri výbere sledujte štandardizované extrakty",
    ],
    excerpt:
      "Prehľad účinných látok a ich praktické využitie pri strese, únave aj výkone.",
    id: "blog-3",
    imageSrc:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    lead: "Adaptogény podporujú odolnosť organizmu voči fyzickému aj psychickému stresu.",
    publishedAt: "2025-12-02",
    readingTime: "6 min",
    sections: [
      {
        paragraphs: [
          "Vyberajte produkty so štandardizovaným extraktom a transparentným zložením.",
        ],
        title: "Ako vyberať adaptogény",
      },
    ],
    slug: "adaptogeny-kedy-ich-zaradit-do-svojho-rezimu",
    tags: ["Fitness"],
    title: "Adaptogény: kedy ich zaradiť do svojho režimu",
    topic: "fitness",
  },
  {
    author: MONIKA_AUTHOR,
    authorBio: MONIKA_AUTHOR_BIO,
    authorImageSrc: MONIKA_AUTHOR_IMAGE,
    authorRole: BLOG_AUTHOR_ROLE,
    bulletPoints: [
      "uprednostnite krátke zloženie bez dráždivých parfumov",
      "testujte nové produkty postupne",
      "kombinujte hydratáciu a ochranu bariéry",
    ],
    excerpt:
      "Na čo sa pozerať pri výbere šetrnej kozmetiky a ktoré látky sa oplatí sledovať.",
    id: "blog-4",
    imageSrc:
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80",
    lead: "Citlivá pokožka reaguje na parfumáciu a agresívne tenzidy výraznejšie.",
    publishedAt: "2025-11-25",
    readingTime: "4 min",
    sections: [
      {
        paragraphs: [
          "Jemné čistenie, hydratačné sérum a ochranný krém s upokojujúcimi zložkami tvoria dobrý základ.",
        ],
        title: "Základná rutina",
      },
    ],
    slug: "prirodna-kozmetika-a-citliva-pokozka",
    tags: ["Krása"],
    title: "Prírodná kozmetika a citlivá pokožka",
    topic: "krasa",
  },
  {
    author: EDITORIAL_AUTHOR,
    authorBio: EDITORIAL_AUTHOR_BIO,
    authorImageSrc: EDITORIAL_AUTHOR_IMAGE,
    authorRole: BLOG_AUTHOR_ROLE,
    bulletPoints: [
      "raňajky a večeru plánujte v pravidelných časoch",
      "do jedálnička zaraďte fermentované potraviny",
      "obmedzte dlhodobý nadbytok ultraprocesovaných potravín",
    ],
    excerpt:
      "Mikrobiom, vláknina a základné návyky, ktoré zlepšujú trávenie aj energiu počas dňa.",
    id: "blog-5",
    imageSrc:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80",
    lead: "Zdravé trávenie je postavené na pravidelnosti. Pomáha dostatok vlákniny, tekutín a vhodne zvolená suplementácia.",
    publishedAt: "2025-11-14",
    readingTime: "5 min",
    sections: [
      {
        paragraphs: [
          "Probiotiká a prebiotiká majú najlepší efekt pri dlhodobejšom užívaní.",
        ],
        title: "Podpora čriev",
      },
    ],
    slug: "travenie-a-metabolizmus-ako-zacat-od-zakladu",
    tags: ["Zdravie"],
    title: "Trávenie a metabolizmus: ako začať od základu",
    topic: "zdravie",
  },
  {
    author: "Katarína Benedová",
    authorBio:
      "Venujem sa výžive, vitality managementu a funkčným doplnkom pre aktívny život.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1542382257-80dedb725088?auto=format&fit=crop&w=320&q=80",
    authorRole: BLOG_AUTHOR_ROLE,
    bulletPoints: [
      "krátka chôdza po jedle zlepšuje cirkuláciu",
      "zaraďte rastlinné steroly a omega-3",
      "pri problémoch sledujte dlhodobosť, nie rýchle výsledky",
    ],
    excerpt:
      "Pohyb, strava a cielené aktívne látky pre lepší krvný obeh a každodennú kondíciu.",
    id: "blog-6",
    imageSrc:
      "https://images.unsplash.com/photo-1460672985063-6764ac8b9c74?auto=format&fit=crop&w=1200&q=80",
    lead: "Podpora ciev začína pri dennom pohybe, stabilnej hmotnosti a dostatočnom príjme omega-3 mastných kyselín.",
    publishedAt: "2025-11-03",
    readingTime: "6 min",
    sections: [
      {
        paragraphs: [
          "Najväčší efekt má dlhodobá, konzistentná starostlivosť. Krátkodobé zmeny pomôžu len čiastočne.",
        ],
        title: "Dlhodobá prevencia",
      },
    ],
    slug: "srdce-a-cievy-ako-podporit-obeh-prirodzene",
    tags: ["Zdravie"],
    title: "Srdce a cievy: ako podporiť obeh prirodzene",
    topic: "zdravie",
  },
  {
    author: MONIKA_AUTHOR,
    authorBio: MONIKA_AUTHOR_BIO,
    authorImageSrc: MONIKA_AUTHOR_IMAGE,
    authorRole: BLOG_AUTHOR_ROLE,
    bulletPoints: [
      "stabilný spánok znižuje hormonálne výkyvy",
      "dôležitý je pravidelný príjem bielkovín",
      "podpora pečene a čriev zlepšuje metabolizmus hormónov",
    ],
    excerpt:
      "Kedy má zmysel upraviť stravu, spánok a podporiť telo cielene zvolenými doplnkami.",
    id: "blog-7",
    imageSrc:
      "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=1200&q=80",
    lead: "Hormonálne zdravie je citlivé na stres, spánok aj výživu. Najviac pomáha celkový režim, nie izolovaný doplnok.",
    publishedAt: "2025-10-22",
    readingTime: "7 min",
    sections: [
      {
        paragraphs: [
          "Vyberte si 2 až 3 návyky, ktoré viete reálne dlhodobo udržať, a postupne pridávajte ďalšie.",
        ],
        title: "Ako začať",
      },
    ],
    slug: "hormonalna-rovnovaha-a-kazdodenny-rezim",
    tags: ["Zdravie"],
    title: "Hormonálna rovnováha a každodenný režim",
    topic: "zdravie",
  },
  {
    author: EDITORIAL_AUTHOR,
    authorBio: EDITORIAL_AUTHOR_BIO,
    authorImageSrc: EDITORIAL_AUTHOR_IMAGE,
    authorRole: BLOG_AUTHOR_ROLE,
    bulletPoints: [
      "krátke prechádzky viackrát denne sú účinnejšie než nárazová záťaž",
      "dbajte na pitný režim počas celého dňa",
      "podporiť môžu aj masáže a jemná mobilita",
    ],
    excerpt:
      "Tipy pre lepší tok lymfy, menšie opuchy a rýchlejšiu regeneráciu po záťaži.",
    id: "blog-8",
    imageSrc:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    lead: "Lymfatický systém nemá vlastnú pumpu, preto potrebuje pravidelný pohyb, hydratáciu a podporu regenerácie.",
    publishedAt: "2025-10-12",
    readingTime: "4 min",
    sections: [
      {
        paragraphs: [
          "Po fyzickej aktivite pomáha kombinácia ľahkého pohybu, hydratácie a kvalitného spánku.",
        ],
        title: "Regeneračný režim",
      },
    ],
    slug: "lymfaticky-system-a-regeneracia",
    tags: ["Zdravie"],
    title: "Lymfatický systém a regenerácia",
    topic: "zdravie",
  },
  {
    author: "Karina Daráková",
    authorBio:
      "Vyštudovala som žurnalistiku a popri redakčnej práci sa venujem aj copywritingu. Pochádzam spod Tatier a milujem cestovanie, hudbu, dobré knihy a beh.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=320&q=80",
    authorRole: BLOG_AUTHOR_ROLE,
    bulletPoints: [
      "magnézium večer, elektrolyty počas dňa",
      "záťaž bez hydratácie znižuje výkon",
      "dôležitá je pravidelnosť, nie nárazové dávky",
    ],
    excerpt:
      "Ako správne kombinovať magnézium, zinok a elektrolyty pri športe aj počas pracovného dňa.",
    id: "blog-9",
    imageSrc:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    lead: "Kombinácia minerálov je efektívna len vtedy, ak rešpektuje individuálnu záťaž a režim dňa.",
    publishedAt: "2025-10-08",
    readingTime: "7 min",
    sections: [
      {
        paragraphs: [
          "Rozdeľte suplementáciu do menších dávok počas dňa a sledujte reakciu organizmu.",
        ],
        title: "Praktické dávkovanie",
      },
    ],
    slug: "mineraly-pre-aktivny-zivot-a-sport",
    tags: ["Fitness"],
    title: "Minerály pre aktívny život a šport",
    topic: "fitness",
  },
  {
    author: MONIKA_AUTHOR,
    authorBio: MONIKA_AUTHOR_BIO,
    authorImageSrc: MONIKA_AUTHOR_IMAGE,
    authorRole: BLOG_AUTHOR_ROLE,
    bulletPoints: [
      "znížte alkohol a ultraprocesované jedlá",
      "podporte pečeň ostropestrecom",
      "hydratujte počas celého dňa",
    ],
    excerpt:
      "Podpora pečene pomocou byliniek, stravy a režimových opatrení, ktoré majú dlhodobý efekt.",
    id: "blog-10",
    imageSrc:
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
    lead: "Pečeň je kľúčový orgán metabolizmu. Podpora funguje najlepšie cez dlhodobé návyky a kvalitný spánok.",
    publishedAt: "2025-09-30",
    readingTime: "5 min",
    sections: [
      {
        paragraphs: [
          "Ostropestrec, púpava a artičok patria medzi najčastejšie používané rastliny pri podpore pečene.",
        ],
        title: "Bylinky pre podporu pečene",
      },
    ],
    slug: "detox-pecene-bez-extremov",
    tags: ["Krása", "Zdravie"],
    title: "Detox pečene bez extrémov",
    topic: "krasa",
  },
  {
    author: "Katarína Benedová",
    authorBio:
      "Venujem sa výžive, vitality managementu a funkčným doplnkom pre aktívny život.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1542382257-80dedb725088?auto=format&fit=crop&w=320&q=80",
    authorRole: BLOG_AUTHOR_ROLE,
    bulletPoints: [
      "kombinujte s vitamínom C",
      "zaradiť aj bielkoviny v strave",
      "sledovať konzistentnosť užívania",
    ],
    excerpt:
      "Kedy siahnuť po kolagéne a ako ho kombinovať s vitamínom C pre lepšiu regeneráciu.",
    id: "blog-11",
    imageSrc:
      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=1200&q=80",
    lead: "Kolagén má najlepší efekt pri pravidelnom užívaní minimálne 8 až 12 týždňov.",
    publishedAt: "2025-09-22",
    readingTime: "6 min",
    sections: [
      {
        paragraphs: [
          "Najčastejšie sa používajú typ I, II a III, pričom každý má mierne odlišné využitie.",
        ],
        title: "Typy kolagénu",
      },
    ],
    slug: "kolagen-pre-klby-a-vaziva",
    tags: ["Fitness", "Zdravie"],
    title: "Kolagén pre kĺby a väzivá",
    topic: "fitness",
  },
  {
    author: EDITORIAL_AUTHOR,
    authorBio: EDITORIAL_AUTHOR_BIO,
    authorImageSrc: EDITORIAL_AUTHOR_IMAGE,
    authorRole: BLOG_AUTHOR_ROLE,
    bulletPoints: [
      "zaraďte vlákninu a fermentované potraviny",
      "probiotiká užívajte dlhodobo",
      "obmedzte zbytočný cukor",
    ],
    excerpt:
      "Ako podporiť črevnú mikroflóru bez zbytočne komplikovaných režimov.",
    id: "blog-12",
    imageSrc:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
    lead: "Zdravé črevá ovplyvňujú imunitu, energiu aj náladu. Probiotiká majú zmysel pri pravidelnom režime.",
    publishedAt: "2025-09-15",
    readingTime: "5 min",
    sections: [
      {
        paragraphs: [
          "Po antibiotikách, pri dlhodobejšom strese alebo pri nepravidelnom trávení vie cielená probiotická kúra pomôcť stabilizovať stav.",
        ],
        title: "Kedy probiotiká pomáhajú",
      },
    ],
    slug: "probiotika-a-travenie-kazdy-den",
    tags: ["Zdravie"],
    title: "Probiotiká a trávenie každý deň",
    topic: "zdravie",
  },
]

const normalizeBlogTopic = (topic: BlogTopicKey | undefined): BlogTopicKey => {
  if (!topic) {
    return "all"
  }

  if (topic === "all") {
    return "all"
  }

  if (BLOG_TOPIC_ONLY_FILTERS.some((item) => item.key === topic)) {
    return topic
  }

  return "all"
}

const resolveBlogTopicFilters = (
  posts = HERBATIKA_BLOG_POSTS,
): BlogTopicFilter[] => {
  const topicCounts = BLOG_TOPIC_ONLY_FILTERS.map((topicFilter) => ({
    ...topicFilter,
    count: posts.filter((post) => post.topic === topicFilter.key).length,
  }))

  return [
    {
      count: posts.length,
      key: "all",
      label: "Všetky",
    },
    ...topicCounts,
  ]
}

export const resolveBlogListing = ({
  posts = HERBATIKA_BLOG_POSTS,
  topic,
  page,
  pageSize = BLOG_PAGE_SIZE,
}: ResolveBlogListingInput) => {
  const normalizedTopic = normalizeBlogTopic(topic)
  const safePageSize = Math.max(pageSize, 1)

  const filteredPosts =
    normalizedTopic === "all"
      ? posts
      : posts.filter((post) => post.topic === normalizedTopic)

  const totalItems = filteredPosts.length
  const totalPages = Math.max(Math.ceil(totalItems / safePageSize), 1)
  const safePage =
    Number.isFinite(page) && Number(page) > 0 ? Math.floor(Number(page)) : 1
  const normalizedPage = Math.min(safePage, totalPages)
  const start = (normalizedPage - 1) * safePageSize

  return {
    hasNextPage: normalizedPage < totalPages,
    hasPreviousPage: normalizedPage > 1,
    page: normalizedPage,
    pageSize: safePageSize,
    posts: filteredPosts.slice(start, start + safePageSize),
    topic: normalizedTopic,
    topicFilters: resolveBlogTopicFilters(posts),
    totalItems,
    totalPages,
  }
}

const BLOG_RECOMMENDED_PRODUCTS_BY_SLUG: Partial<
  Record<string, BlogRecommendedProductsConfig>
> = {
  "adaptogeny-kedy-ich-zaradit-do-svojho-rezimu": {
    categoryHandles: [
      "doplnky-vyzivy-adaptogeny",
      HERBAL_EXTRACTS_CATEGORY_HANDLE,
    ],
    limit: 10,
  },
  "ashwagandha-adaptogen-pre-rovnovahu-tela-a-mysle": {
    categoryHandles: [
      "doplnky-vyzivy-adaptogeny",
      HERBAL_EXTRACTS_CATEGORY_HANDLE,
    ],
    limit: 10,
  },
  "detox-pecene-bez-extremov": {
    categoryHandles: [
      "trapi-ma-travenie-a-metabolizmus-pecen-a-zlcnik",
      HERBAL_EXTRACTS_CATEGORY_HANDLE,
    ],
    limit: 10,
  },
  "elektrolyty-klucove-mineraly-pre-spravne-fungovanie-tela": {
    categoryHandles: [
      "doplnky-vyzivy-vitaminy-a-mineraly",
      "doplnky-vyzivy-lipozomalne-vitaminy",
    ],
    limit: 10,
  },
  "hormonalna-rovnovaha-a-kazdodenny-rezim": {
    categoryHandles: [
      "trapi-ma-hormonalna-rovnovaha-zenske-zdravie-2",
      "trapi-ma-hormonalna-rovnovaha-stitna-zlaza",
    ],
    limit: 10,
  },
  "kolagen-pre-klby-a-vaziva": {
    categoryHandles: [
      "trapi-ma-klby-a-pohybovy-aparat-klby",
      "trapi-ma-klby-a-pohybovy-aparat-chrupavky",
    ],
    limit: 10,
  },
  "lymfaticky-system-a-regeneracia": {
    categoryHandles: [
      "trapi-ma-srdce-a-cievy-lymfaticky-system-2",
      "trapi-ma-srdce-a-cievy-krcove-zily-2",
    ],
    limit: 10,
  },
  "mineraly-pre-aktivny-zivot-a-sport": {
    categoryHandles: [
      "doplnky-vyzivy-vitaminy-a-mineraly",
      "doplnky-vyzivy-lipozomalne-vitaminy",
    ],
    limit: 10,
  },
  "prirodna-kozmetika-a-citliva-pokozka": {
    categoryHandles: [
      "prirodna-kozmetika-pletova-kozmetika-specialna-starostlivost-o-plet",
      "prirodna-kozmetika-pletova-kozmetika-pletove-kremy",
    ],
    limit: 10,
  },
  "probiotika-a-travenie-kazdy-den": {
    categoryHandles: [
      "doplnky-vyzivy-probiotika-a-prebiotika",
      "trapi-ma-travenie-a-metabolizmus-creva-a-crevna-mikroflora",
    ],
    limit: 10,
  },
  "srdce-a-cievy-ako-podporit-obeh-prirodzene": {
    categoryHandles: [
      "trapi-ma-srdce-a-cievy-cholesterol",
      "trapi-ma-srdce-a-cievy-vysoky-krvny-tlak",
    ],
    limit: 10,
  },
  "travenie-a-metabolizmus-ako-zacat-od-zakladu": {
    categoryHandles: [
      "trapi-ma-travenie-a-metabolizmus-travenie-a-zaludok",
      "trapi-ma-travenie-a-metabolizmus-creva-a-crevna-mikroflora",
    ],
    limit: 10,
  },
}

export const resolveBlogPostBySlug = (
  slug: string,
  posts = HERBATIKA_BLOG_POSTS,
) => posts.find((post) => post.slug === slug) ?? null

export const resolveBlogRecommendedProductsConfig = (slug: string) =>
  BLOG_RECOMMENDED_PRODUCTS_BY_SLUG[slug] ?? null

export const resolveRelatedBlogPosts = (
  slug: string,
  limit = 4,
  posts = HERBATIKA_BLOG_POSTS,
) => posts.filter((post) => post.slug !== slug).slice(0, limit)
