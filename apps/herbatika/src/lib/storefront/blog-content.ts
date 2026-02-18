export type BlogTopicKey = "all" | "fitness" | "krasa" | "zdravie";

export type BlogPostSection = {
  title: string;
  paragraphs: string[];
  bulletPoints?: string[];
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  imageSrc: string;
  topic: Exclude<BlogTopicKey, "all">;
  tags: string[];
  publishedAt: string;
  author: string;
  authorRole: string;
  authorBio: string;
  authorImageSrc: string;
  readingTime: string;
  lead: string;
  bulletPoints: string[];
  sections: BlogPostSection[];
};

export type BlogTopicFilter = {
  key: BlogTopicKey;
  label: string;
  count: number;
};

export type ResolveBlogListingInput = {
  topic?: BlogTopicKey;
  page?: number;
  pageSize?: number;
};

export const BLOG_PAGE_SIZE = 12;

const BLOG_TOPIC_ONLY_FILTERS: Array<{
  key: Exclude<BlogTopicKey, "all">;
  label: string;
}> = [
  { key: "fitness", label: "Fitness" },
  { key: "krasa", label: "Krása" },
  { key: "zdravie", label: "Zdravie" },
];

export const BLOG_SIDEBAR_CATEGORIES = [
  { label: "Kapsuly", count: 4 },
  { label: "Tablety", count: 28 },
  { label: "Softgel", count: 46 },
  { label: "Prášok", count: 14 },
  { label: "Tekutiny", count: 9 },
  { label: "Nápoj", count: 2 },
  { label: "Kvapky", count: 27 },
  { label: "Sprej", count: 3 },
  { label: "Sirup", count: 1 },
];

export const BLOG_PROMO_BANNER = {
  title: "ZĽAVA 20 %",
  subtitle: "na bestsellery",
  codeLabel: "KÓD:",
  codeValue: "TOP20",
  imageSrc:
    "https://images.unsplash.com/photo-1611078489935-0cb964de46d6?auto=format&fit=crop&w=720&q=80",
};

export const BLOG_FEATURED_PRODUCT = {
  title: "Sofia krém na žily s extraktom z pijavice lekárskej a pagaštanom",
  excerpt:
    "Podporte harmóniu medzi cievom a mysľou s unikátnou kombináciou šafranu, probiotík a prebiotík.",
  imageSrc:
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=640&q=80",
  badges: ["Akcia", "Novinka", "Tip"],
  oldPrice: "20,23 €",
  price: "16,83 €",
  discountLabel: "-4,50 €",
};

export const BLOG_INLINE_PRODUCTS = [
  {
    id: "inline-product-1",
    title: "Sofia krém na žily s extraktom z pijavice lekárskej",
    excerpt:
      "Podporte harmóniu medzi cievom a mysľou s unikátnou kombináciou šafranu, probiotík a prebiotík.",
    imageSrc:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=640&q=80",
    badges: ["Novinka"],
    oldPrice: "20,23 €",
    price: "16,83 €",
    discountLabel: null,
  },
  {
    id: "inline-product-2",
    title: "Yucca kapsuly pre pohybový aparát",
    excerpt:
      "Podpora pohybového aparátu a každodennej vitality pri zvýšenej fyzickej záťaži.",
    imageSrc:
      "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=640&q=80",
    badges: ["Novinka", "Tip"],
    oldPrice: null,
    price: "16,83 €",
    discountLabel: null,
  },
  {
    id: "inline-product-3",
    title: "Pine pollen 100% kapsuly",
    excerpt:
      "Prírodná podpora vitality a energie pre každodenné fungovanie organizmu.",
    imageSrc:
      "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=640&q=80",
    badges: ["Akcia"],
    oldPrice: "20,23 €",
    price: "16,83 €",
    discountLabel: "-4,50 €",
  },
  {
    id: "inline-product-4",
    title: "Bylinný komplex pre zdravé kĺby",
    excerpt:
      "Vyvážené zloženie bylinných extraktov pre aktívny pohyb bez kompromisov.",
    imageSrc:
      "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=640&q=80",
    badges: ["Tip"],
    oldPrice: null,
    price: "16,83 €",
    discountLabel: null,
  },
] as const;

export const HERBATIKA_BLOG_POSTS: BlogPost[] = [
  {
    id: "blog-1",
    slug: "elektrolyty-klucove-mineraly-pre-spravne-fungovanie-tela",
    title: "Elektrolyty: kľúčové minerály pre správne fungovanie tela",
    excerpt:
      "Ako podporiť regeneráciu pohybového aparátu, doplniť minerály a zlepšiť každodennú vitalitu bez zbytočných extrémov.",
    imageSrc:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
    topic: "zdravie",
    tags: ["Fitness", "Krása"],
    publishedAt: "2025-12-06",
    author: "Karina Daráková",
    authorRole: "Článok pre vás pripravila",
    authorBio:
      "Vyštudovala som žurnalistiku a popri redakčnej práci sa venujem aj copywritingu. Pochádzam spod Tatier a milujem cestovanie, hudbu, dobré knihy a beh.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=320&q=80",
    readingTime: "9 min",
    lead:
      "Elektrolyty predstavujú skupinu minerálov, ktoré nesú elektrický náboj a zabezpečujú množstvo nevyhnutných funkcií v ľudskom tele.",
    bulletPoints: [
      "hydratačný režim a dopĺňanie minerálov plánujte počas celého dňa",
      "kombinujte horčík, draslík a sodík podľa záťaže, nie nárazovo",
      "pri aktívnom pohybe doplňte aj kolagén, vitamín C a omega-3",
    ],
    sections: [
      {
        title: "Čo sú elektrolyty a prečo sú nevyhnutné",
        paragraphs: [
          "Elektrolyty pomáhajú regulovať svalové kontrakcie, nervové impulzy aj hydratáciu buniek. Pri ich poklese telo funguje menej efektívne a to sa prejaví na výkone aj regenerácii.",
          "V bežnom živote k stratám dochádza najmä počas stresu, fyzickej záťaže alebo pri nedostatočnom pitnom režime.",
        ],
      },
      {
        title: "Najdôležitejšie elektrolyty a ich úlohy",
        paragraphs: [
          "Sodík a draslík ovplyvňujú rovnováhu tekutín, horčík podporuje svalovú a nervovú sústavu a vápnik je dôležitý pre kontrakciu svalov.",
          "Pri dlhšej fyzickej aktivite má význam dopĺňať elektrolyty priebežne, nie až po výkone.",
        ],
        bulletPoints: [
          "sodík: udržiavanie hydratácie a krvného tlaku",
          "draslík: funkcia svalov a nervových impulzov",
          "horčík: regenerácia, únava a svalové kŕče",
        ],
      },
      {
        title: "Mechanizmus regulácie elektrolytov v tele",
        paragraphs: [
          "Organizmus priebežne reguluje hladiny elektrolytov cez obličky, hormóny a príjem tekutín. Dlhodobý deficit sa prejaví poklesom energie aj výkonnosti.",
        ],
      },
      {
        title: "Dôsledky nerovnováhy elektrolytov",
        paragraphs: [
          "Nerovnováha môže viesť k únave, svalovým kŕčom, bolestiam hlavy alebo zníženej tolerancii záťaže. Včasné doplnenie je jednoduchý krok s veľkým efektom.",
        ],
      },
      {
        title: "Ako nastaviť praktický režim",
        paragraphs: [
          "Základ je konzistentnosť: pravidelný príjem tekutín, minerálov a kvalitná strava bohatá na zeleninu, bielkoviny a zdravé tuky.",
          "Pri zvýšenej záťaži má význam zaradiť cielene výživové doplnky s overeným zložením a jasným dávkovaním.",
        ],
      },
    ],
  },
  {
    id: "blog-2",
    slug: "ashwagandha-adaptogen-pre-rovnovahu-tela-a-mysle",
    title: "Ashwagandha: adaptogén pre rovnováhu tela a mysle",
    excerpt:
      "Ashwagandha patrí medzi prírodné adaptogény a vyniká priaznivými účinkami na telo aj myseľ.",
    imageSrc:
      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=1200&q=80",
    topic: "fitness",
    tags: ["Fitness"],
    publishedAt: "2025-12-05",
    author: "Herbatika redakcia",
    authorRole: "Článok pre vás pripravila",
    authorBio: "Redakčný tím Herbatika pripravuje odborný obsah o zdraví, výžive a prírodnej starostlivosti.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=320&q=80",
    readingTime: "9 min",
    lead:
      "Adaptogény podporujú odolnosť organizmu voči fyzickému aj psychickému stresu. Dôležité je správne dávkovanie a načasovanie.",
    bulletPoints: [
      "ashwagandha je vhodná pri napätí a zhoršenom spánku",
      "podporuje regeneráciu po záťaži",
      "účinky sledujte minimálne 3 až 4 týždne",
    ],
    sections: [
      {
        title: "Kedy ashwagandhu zaradiť",
        paragraphs: [
          "Pri dlhodobom strese, horšej kvalite spánku alebo psychickom vyčerpaní môže byť ashwagandha vhodnou súčasťou denného režimu.",
        ],
      },
    ],
  },
  {
    id: "blog-3",
    slug: "adaptogeny-kedy-ich-zaradit-do-svojho-rezimu",
    title: "Adaptogény: kedy ich zaradiť do svojho režimu",
    excerpt:
      "Prehľad účinných látok a ich praktické využitie pri strese, únave aj výkone.",
    imageSrc:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    topic: "fitness",
    tags: ["Fitness"],
    publishedAt: "2025-12-02",
    author: "Herbatika redakcia",
    authorRole: "Článok pre vás pripravila",
    authorBio: "Redakčný tím Herbatika pripravuje odborný obsah o zdraví, výžive a prírodnej starostlivosti.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=320&q=80",
    readingTime: "6 min",
    lead:
      "Adaptogény podporujú odolnosť organizmu voči fyzickému aj psychickému stresu.",
    bulletPoints: [
      "rhodiola podporuje energiu a koncentráciu",
      "ženšen pomáha pri únave",
      "pri výbere sledujte štandardizované extrakty",
    ],
    sections: [
      {
        title: "Ako vyberať adaptogény",
        paragraphs: [
          "Vyberajte produkty so štandardizovaným extraktom a transparentným zložením.",
        ],
      },
    ],
  },
  {
    id: "blog-4",
    slug: "prirodna-kozmetika-a-citliva-pokozka",
    title: "Prírodná kozmetika a citlivá pokožka",
    excerpt:
      "Na čo sa pozerať pri výbere šetrnej kozmetiky a ktoré látky sa oplatí sledovať.",
    imageSrc:
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80",
    topic: "krasa",
    tags: ["Krása"],
    publishedAt: "2025-11-25",
    author: "Monika Kováčová",
    authorRole: "Článok pre vás pripravila",
    authorBio: "Špecializujem sa na prírodnú kozmetiku, citlivú pokožku a funkčné zloženia bez kompromisov.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=320&q=80",
    readingTime: "4 min",
    lead:
      "Citlivá pokožka reaguje na parfumáciu a agresívne tenzidy výraznejšie.",
    bulletPoints: [
      "uprednostnite krátke zloženie bez dráždivých parfumov",
      "testujte nové produkty postupne",
      "kombinujte hydratáciu a ochranu bariéry",
    ],
    sections: [
      {
        title: "Základná rutina",
        paragraphs: [
          "Jemné čistenie, hydratačné sérum a ochranný krém s upokojujúcimi zložkami tvoria dobrý základ.",
        ],
      },
    ],
  },
  {
    id: "blog-5",
    slug: "travenie-a-metabolizmus-ako-zacat-od-zakladu",
    title: "Trávenie a metabolizmus: ako začať od základu",
    excerpt:
      "Mikrobiom, vláknina a základné návyky, ktoré zlepšujú trávenie aj energiu počas dňa.",
    imageSrc:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80",
    topic: "zdravie",
    tags: ["Zdravie"],
    publishedAt: "2025-11-14",
    author: "Herbatika redakcia",
    authorRole: "Článok pre vás pripravila",
    authorBio: "Redakčný tím Herbatika pripravuje odborný obsah o zdraví, výžive a prírodnej starostlivosti.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=320&q=80",
    readingTime: "5 min",
    lead:
      "Zdravé trávenie je postavené na pravidelnosti. Pomáha dostatok vlákniny, tekutín a vhodne zvolená suplementácia.",
    bulletPoints: [
      "raňajky a večeru plánujte v pravidelných časoch",
      "do jedálnička zaraďte fermentované potraviny",
      "obmedzte dlhodobý nadbytok ultraprocesovaných potravín",
    ],
    sections: [
      {
        title: "Podpora čriev",
        paragraphs: [
          "Probiotiká a prebiotiká majú najlepší efekt pri dlhodobejšom užívaní.",
        ],
      },
    ],
  },
  {
    id: "blog-6",
    slug: "srdce-a-cievy-ako-podporit-obeh-prirodzene",
    title: "Srdce a cievy: ako podporiť obeh prirodzene",
    excerpt:
      "Pohyb, strava a cielené aktívne látky pre lepší krvný obeh a každodennú kondíciu.",
    imageSrc:
      "https://images.unsplash.com/photo-1460672985063-6764ac8b9c74?auto=format&fit=crop&w=1200&q=80",
    topic: "zdravie",
    tags: ["Zdravie"],
    publishedAt: "2025-11-03",
    author: "Katarína Benedová",
    authorRole: "Článok pre vás pripravila",
    authorBio: "Venujem sa výžive, vitality managementu a funkčným doplnkom pre aktívny život.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1542382257-80dedb725088?auto=format&fit=crop&w=320&q=80",
    readingTime: "6 min",
    lead:
      "Podpora ciev začína pri dennom pohybe, stabilnej hmotnosti a dostatočnom príjme omega-3 mastných kyselín.",
    bulletPoints: [
      "krátka chôdza po jedle zlepšuje cirkuláciu",
      "zaraďte rastlinné steroly a omega-3",
      "pri problémoch sledujte dlhodobosť, nie rýchle výsledky",
    ],
    sections: [
      {
        title: "Dlhodobá prevencia",
        paragraphs: [
          "Najväčší efekt má dlhodobá, konzistentná starostlivosť. Krátkodobé zmeny pomôžu len čiastočne.",
        ],
      },
    ],
  },
  {
    id: "blog-7",
    slug: "hormonalna-rovnovaha-a-kazdodenny-rezim",
    title: "Hormonálna rovnováha a každodenný režim",
    excerpt:
      "Kedy má zmysel upraviť stravu, spánok a podporiť telo cielene zvolenými doplnkami.",
    imageSrc:
      "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=1200&q=80",
    topic: "zdravie",
    tags: ["Zdravie"],
    publishedAt: "2025-10-22",
    author: "Monika Kováčová",
    authorRole: "Článok pre vás pripravila",
    authorBio: "Špecializujem sa na prírodnú kozmetiku, citlivú pokožku a funkčné zloženia bez kompromisov.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=320&q=80",
    readingTime: "7 min",
    lead:
      "Hormonálne zdravie je citlivé na stres, spánok aj výživu. Najviac pomáha celkový režim, nie izolovaný doplnok.",
    bulletPoints: [
      "stabilný spánok znižuje hormonálne výkyvy",
      "dôležitý je pravidelný príjem bielkovín",
      "podpora pečene a čriev zlepšuje metabolizmus hormónov",
    ],
    sections: [
      {
        title: "Ako začať",
        paragraphs: [
          "Vyberte si 2 až 3 návyky, ktoré viete reálne dlhodobo udržať, a postupne pridávajte ďalšie.",
        ],
      },
    ],
  },
  {
    id: "blog-8",
    slug: "lymfaticky-system-a-regeneracia",
    title: "Lymfatický systém a regenerácia",
    excerpt:
      "Tipy pre lepší tok lymfy, menšie opuchy a rýchlejšiu regeneráciu po záťaži.",
    imageSrc:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    topic: "zdravie",
    tags: ["Zdravie"],
    publishedAt: "2025-10-12",
    author: "Herbatika redakcia",
    authorRole: "Článok pre vás pripravila",
    authorBio: "Redakčný tím Herbatika pripravuje odborný obsah o zdraví, výžive a prírodnej starostlivosti.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=320&q=80",
    readingTime: "4 min",
    lead:
      "Lymfatický systém nemá vlastnú pumpu, preto potrebuje pravidelný pohyb, hydratáciu a podporu regenerácie.",
    bulletPoints: [
      "krátke prechádzky viackrát denne sú účinnejšie než nárazová záťaž",
      "dbajte na pitný režim počas celého dňa",
      "podporiť môžu aj masáže a jemná mobilita",
    ],
    sections: [
      {
        title: "Regeneračný režim",
        paragraphs: [
          "Po fyzickej aktivite pomáha kombinácia ľahkého pohybu, hydratácie a kvalitného spánku.",
        ],
      },
    ],
  },
  {
    id: "blog-9",
    slug: "mineraly-pre-aktivny-zivot-a-sport",
    title: "Minerály pre aktívny život a šport",
    excerpt:
      "Ako správne kombinovať magnézium, zinok a elektrolyty pri športe aj počas pracovného dňa.",
    imageSrc:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    topic: "fitness",
    tags: ["Fitness"],
    publishedAt: "2025-10-08",
    author: "Karina Daráková",
    authorRole: "Článok pre vás pripravila",
    authorBio:
      "Vyštudovala som žurnalistiku a popri redakčnej práci sa venujem aj copywritingu. Pochádzam spod Tatier a milujem cestovanie, hudbu, dobré knihy a beh.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=320&q=80",
    readingTime: "7 min",
    lead: "Kombinácia minerálov je efektívna len vtedy, ak rešpektuje individuálnu záťaž a režim dňa.",
    bulletPoints: [
      "magnézium večer, elektrolyty počas dňa",
      "záťaž bez hydratácie znižuje výkon",
      "dôležitá je pravidelnosť, nie nárazové dávky",
    ],
    sections: [
      {
        title: "Praktické dávkovanie",
        paragraphs: [
          "Rozdeľte suplementáciu do menších dávok počas dňa a sledujte reakciu organizmu.",
        ],
      },
    ],
  },
  {
    id: "blog-10",
    slug: "detox-pecene-bez-extremov",
    title: "Detox pečene bez extrémov",
    excerpt:
      "Podpora pečene pomocou byliniek, stravy a režimových opatrení, ktoré majú dlhodobý efekt.",
    imageSrc:
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
    topic: "krasa",
    tags: ["Krása", "Zdravie"],
    publishedAt: "2025-09-30",
    author: "Monika Kováčová",
    authorRole: "Článok pre vás pripravila",
    authorBio: "Špecializujem sa na prírodnú kozmetiku, citlivú pokožku a funkčné zloženia bez kompromisov.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=320&q=80",
    readingTime: "5 min",
    lead:
      "Pečeň je kľúčový orgán metabolizmu. Podpora funguje najlepšie cez dlhodobé návyky a kvalitný spánok.",
    bulletPoints: [
      "znížte alkohol a ultraprocesované jedlá",
      "podporte pečeň ostropestrecom",
      "hydratujte počas celého dňa",
    ],
    sections: [
      {
        title: "Bylinky pre podporu pečene",
        paragraphs: [
          "Ostropestrec, púpava a artičok patria medzi najčastejšie používané rastliny pri podpore pečene.",
        ],
      },
    ],
  },
  {
    id: "blog-11",
    slug: "kolagen-pre-klby-a-vaziva",
    title: "Kolagén pre kĺby a väzivá",
    excerpt:
      "Kedy siahnuť po kolagéne a ako ho kombinovať s vitamínom C pre lepšiu regeneráciu.",
    imageSrc:
      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=1200&q=80",
    topic: "fitness",
    tags: ["Fitness", "Zdravie"],
    publishedAt: "2025-09-22",
    author: "Katarína Benedová",
    authorRole: "Článok pre vás pripravila",
    authorBio: "Venujem sa výžive, vitality managementu a funkčným doplnkom pre aktívny život.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1542382257-80dedb725088?auto=format&fit=crop&w=320&q=80",
    readingTime: "6 min",
    lead:
      "Kolagén má najlepší efekt pri pravidelnom užívaní minimálne 8 až 12 týždňov.",
    bulletPoints: [
      "kombinujte s vitamínom C",
      "zaradiť aj bielkoviny v strave",
      "sledovať konzistentnosť užívania",
    ],
    sections: [
      {
        title: "Typy kolagénu",
        paragraphs: [
          "Najčastejšie sa používajú typ I, II a III, pričom každý má mierne odlišné využitie.",
        ],
      },
    ],
  },
  {
    id: "blog-12",
    slug: "probiotika-a-travenie-kazdy-den",
    title: "Probiotiká a trávenie každý deň",
    excerpt:
      "Ako podporiť črevnú mikroflóru bez zbytočne komplikovaných režimov.",
    imageSrc:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
    topic: "zdravie",
    tags: ["Zdravie"],
    publishedAt: "2025-09-15",
    author: "Herbatika redakcia",
    authorRole: "Článok pre vás pripravila",
    authorBio: "Redakčný tím Herbatika pripravuje odborný obsah o zdraví, výžive a prírodnej starostlivosti.",
    authorImageSrc:
      "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=320&q=80",
    readingTime: "5 min",
    lead:
      "Zdravé črevá ovplyvňujú imunitu, energiu aj náladu. Probiotiká majú zmysel pri pravidelnom režime.",
    bulletPoints: [
      "zaraďte vlákninu a fermentované potraviny",
      "probiotiká užívajte dlhodobo",
      "obmedzte zbytočný cukor",
    ],
    sections: [
      {
        title: "Kedy probiotiká pomáhajú",
        paragraphs: [
          "Po antibiotikách, pri dlhodobejšom strese alebo pri nepravidelnom trávení vie cielená probiotická kúra pomôcť stabilizovať stav.",
        ],
      },
    ],
  },
];

const normalizeBlogTopic = (topic: BlogTopicKey | undefined): BlogTopicKey => {
  if (!topic) {
    return "all";
  }

  if (topic === "all") {
    return "all";
  }

  if (BLOG_TOPIC_ONLY_FILTERS.some((item) => item.key === topic)) {
    return topic;
  }

  return "all";
};

export const resolveBlogTopicFilters = (): BlogTopicFilter[] => {
  const topicCounts = BLOG_TOPIC_ONLY_FILTERS.map((topicFilter) => {
    return {
      ...topicFilter,
      count: HERBATIKA_BLOG_POSTS.filter((post) => post.topic === topicFilter.key)
        .length,
    };
  });

  return [
    {
      key: "all",
      label: "Všetky",
      count: HERBATIKA_BLOG_POSTS.length,
    },
    ...topicCounts,
  ];
};

export const resolveBlogListing = ({
  topic,
  page,
  pageSize = BLOG_PAGE_SIZE,
}: ResolveBlogListingInput) => {
  const normalizedTopic = normalizeBlogTopic(topic);
  const safePageSize = Math.max(pageSize, 1);

  const filteredPosts =
    normalizedTopic === "all"
      ? HERBATIKA_BLOG_POSTS
      : HERBATIKA_BLOG_POSTS.filter((post) => post.topic === normalizedTopic);

  const totalItems = filteredPosts.length;
  const totalPages = Math.max(Math.ceil(totalItems / safePageSize), 1);
  const safePage = Number.isFinite(page) && Number(page) > 0 ? Math.floor(Number(page)) : 1;
  const normalizedPage = Math.min(safePage, totalPages);
  const start = (normalizedPage - 1) * safePageSize;

  return {
    topic: normalizedTopic,
    page: normalizedPage,
    totalItems,
    totalPages,
    pageSize: safePageSize,
    hasPreviousPage: normalizedPage > 1,
    hasNextPage: normalizedPage < totalPages,
    posts: filteredPosts.slice(start, start + safePageSize),
    topicFilters: resolveBlogTopicFilters(),
  };
};

export const resolveBlogPostBySlug = (slug: string) => {
  return HERBATIKA_BLOG_POSTS.find((post) => post.slug === slug) ?? null;
};

export const resolveRelatedBlogPosts = (slug: string, limit = 4) => {
  return HERBATIKA_BLOG_POSTS.filter((post) => post.slug !== slug).slice(0, limit);
};
