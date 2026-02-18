"use client";

import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon";
import { Image } from "@techsio/ui-kit/atoms/image";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Rating } from "@techsio/ui-kit/atoms/rating";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import {
  Carousel,
  type CarouselSlide,
} from "@techsio/ui-kit/molecules/carousel";
import NextLink from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAddLineItem, useCart } from "@/lib/storefront/cart";
import {
  STOREFRONT_PRODUCT_CARD_FIELDS,
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  usePrefetchProduct,
  usePrefetchProducts,
  useProducts,
} from "@/lib/storefront/products";
import { getProductPriceLabel } from "./herbatika-product-card";
import { HerbatikaProductGrid } from "./product/herbatika-product-grid";
import { HerbatikaProductGridSkeleton } from "./product/herbatika-product-grid-skeleton";

const PRODUCT_FETCH_LIMIT = 24;
const PRODUCTS_PER_GRID_SECTION = 4;

type HeroBannerItem = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  imageSrc: string;
};

type BenefitItem = {
  id: string;
  title: string;
  description: string;
  icon: IconType;
};

type ReviewItem = {
  id: string;
  author: string;
  title: string;
  message: string;
  rating: number;
};

type BlogTeaserItem = {
  id: string;
  title: string;
  excerpt: string;
  href: string;
  imageSrc: string;
};

type ProductSectionDefinition = {
  id: string;
  title: string;
  subtitle: string;
};

const HERO_BANNERS: HeroBannerItem[] = [
  {
    id: "hero-immune",
    title: "Silná imunita počas celého roka",
    subtitle: "Bylinné extrakty, vitamíny a minerály pre každý deň.",
    badge: "Imunita",
    href: "/c/trapi-ma",
    imageSrc:
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-cosmetics",
    title: "Prírodná kozmetika bez kompromisov",
    subtitle: "Objavte jemnú starostlivosť o pleť a telo.",
    badge: "Kozmetika",
    href: "/c/prirodna-kozmetika",
    imageSrc:
      "https://images.unsplash.com/photo-1571875257727-256c39da42af?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-tea",
    title: "Bylinky a čaje pre pokojný deň",
    subtitle: "Vyberte si z overených kombinácií od Herbatica.",
    badge: "Bylinky",
    href: "/c/potraviny-a-napoje",
    imageSrc:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-supplements",
    title: "Doplnky výživy pre vitalitu",
    subtitle: "Kapsuly, tinktúry aj funkčné zmesi na mieru.",
    badge: "Doplnky",
    href: "/c/doplnky-vyzivy",
    imageSrc:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-home",
    title: "EKO domácnosť bez chemického zaťaženia",
    subtitle: "Čistejšie prostredie pre vás aj vašu rodinu.",
    badge: "EKO domácnosť",
    href: "/c/eko-domacnost",
    imageSrc:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-action",
    title: "Akčné ponuky až do vypredania",
    subtitle: "Vyberte si zvýhodnené produkty ešte dnes.",
    badge: "Akcia",
    href: "/c/vypredaj-zlavy-a-akcie",
    imageSrc:
      "https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-gift",
    title: "Darčeky pre zdravie a radosť",
    subtitle: "Pripravené balíčky pre vašich blízkych.",
    badge: "Darčeky",
    href: "/c/darceky",
    imageSrc:
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-news",
    title: "Novinky zo sveta prírody",
    subtitle: "Pravidelne dopĺňame nové značky a produkty.",
    badge: "Novinky",
    href: "/c/novinky",
    imageSrc:
      "https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=900&q=80",
  },
];

const BENEFITS: BenefitItem[] = [
  {
    id: "benefit-verified",
    title: "Overené produkty",
    description: "Dlhodobo testované značky.",
    icon: "icon-[mdi--shield-check-outline]",
  },
  {
    id: "benefit-delivery",
    title: "Rýchle doručenie",
    description: "Odosielame každý pracovný deň.",
    icon: "icon-[mdi--truck-fast-outline]",
  },
  {
    id: "benefit-support",
    title: "Odborné poradenstvo",
    description: "Pomôžeme s výberom.",
    icon: "icon-[mdi--headset]",
  },
  {
    id: "benefit-loyalty",
    title: "Vernostné výhody",
    description: "Zľavy pre pravidelných zákazníkov.",
    icon: "icon-[mdi--star-circle-outline]",
  },
  {
    id: "benefit-natural",
    title: "Prírodné zloženie",
    description: "Fokus na čisté ingrediencie.",
    icon: "icon-[mdi--leaf-circle-outline]",
  },
  {
    id: "benefit-secure",
    title: "Bezpečný nákup",
    description: "Overené platobné metódy.",
    icon: "icon-[mdi--credit-card-check-outline]",
  },
  {
    id: "benefit-eu",
    title: "SK, CZ, HU, RO",
    description: "Dodávame do viacerých krajín.",
    icon: "icon-[mdi--map-marker-radius-outline]",
  },
  {
    id: "benefit-eco",
    title: "EKO balenie",
    description: "Šetrne k prírode.",
    icon: "icon-[mdi--recycle-variant]",
  },
];

const PRODUCT_SECTIONS: ProductSectionDefinition[] = [
  {
    id: "najpredavanejsie-produkty",
    title: "Najpredávanejšie produkty",
    subtitle: "Produkty, po ktorých zákazníci siahajú najčastejšie.",
  },
  {
    id: "novinky",
    title: "Novinky",
    subtitle: "Čerstvo naskladnené produkty v našej ponuke.",
  },
  {
    id: "atraktivna-v-cene",
    title: "Atraktívna v cene",
    subtitle: "Výber produktov s výhodnou cenou.",
  },
];

const REVIEWS: ReviewItem[] = [
  {
    id: "review-1",
    author: "Veronika M.",
    title: "Rýchle doručenie a kvalitné produkty",
    message:
      "Objednávka prišla rýchlo, produkty boli dobre zabalené a kvalita je výborná.",
    rating: 5,
  },
  {
    id: "review-2",
    author: "Peter H.",
    title: "Skvelý výber doplnkov",
    message:
      "Našiel som presne to, čo som potreboval. Oceňujem detailné popisy produktov.",
    rating: 4.5,
  },
  {
    id: "review-3",
    author: "Jana K.",
    title: "Príjemná zákaznícka podpora",
    message:
      "Pomohli mi s výberom a poradili vhodnú kombináciu produktov. Odporúčam.",
    rating: 5,
  },
];

const BLOG_POSTS: BlogTeaserItem[] = [
  {
    id: "blog-1",
    title: "Ako podporiť imunitu počas náročných mesiacov",
    excerpt:
      "Praktické tipy na každodennú rutinu, ktorá pomáha udržať obranyschopnosť v kondícii.",
    href: "/blog",
    imageSrc:
      "https://images.unsplash.com/photo-1470549638415-0a0755be0619?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "blog-2",
    title: "Adaptogény: kedy ich zaradiť do svojho režimu",
    excerpt:
      "Prehľad účinných látok a ich praktické využitie pri strese, únave aj výkone.",
    href: "/blog",
    imageSrc:
      "https://images.unsplash.com/photo-1542444459-db63c773c245?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "blog-3",
    title: "Prírodná kozmetika a citlivá pokožka",
    excerpt:
      "Na čo sa pozerať pri výbere šetrnej kozmetiky a ktoré látky sa oplatí sledovať.",
    href: "/blog",
    imageSrc:
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=900&q=80",
  },
];

const HERO_PAGE_SIZE = 4;
const TOTAL_GRID_PRODUCTS = PRODUCT_SECTIONS.length * PRODUCTS_PER_GRID_SECTION;
const RECENT_PRODUCT_SKELETON_KEYS = [
  "recent-product-skeleton-1",
  "recent-product-skeleton-2",
  "recent-product-skeleton-3",
  "recent-product-skeleton-4",
] as const;

const buildHeroSlides = (): CarouselSlide[] => {
  const slides: CarouselSlide[] = [];

  for (let offset = 0; offset < HERO_BANNERS.length; offset += HERO_PAGE_SIZE) {
    const page = HERO_BANNERS.slice(offset, offset + HERO_PAGE_SIZE);
    const pageIndex = Math.floor(offset / HERO_PAGE_SIZE) + 1;

    slides.push({
      id: `hero-page-${pageIndex}`,
      content: (
        <div className="grid h-full w-full grid-cols-2 gap-300 lg:grid-cols-4">
          {page.map((banner) => (
            <Link
              as={NextLink}
              className="group relative h-full overflow-hidden rounded-2xl border border-border-secondary"
              href={banner.href}
              key={banner.id}
            >
              <Image
                alt={banner.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                src={banner.imageSrc}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-fg-primary/70 via-fg-primary/20 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-300 text-fg-reverse">
                <Badge
                  className="mb-100 rounded-full px-200 py-50 text-2xs font-semibold uppercase"
                  variant="secondary"
                >
                  {banner.badge}
                </Badge>
                <p className="line-clamp-2 text-sm leading-tight font-bold">
                  {banner.title}
                </p>
                <p className="line-clamp-2 text-xs text-fg-reverse/85">
                  {banner.subtitle}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ),
    });
  }

  return slides;
};

const HERO_SLIDES = buildHeroSlides();

const getSectionProducts = (
  products: HttpTypes.StoreProduct[],
  start: number,
  size: number,
) => {
  if (products.length === 0) {
    return [];
  }

  const chunk = products.slice(start, start + size);
  if (chunk.length === size) {
    return chunk;
  }

  const fallback = products.slice(0, Math.max(size - chunk.length, 0));
  return [...chunk, ...fallback];
};

export function HerbatikaHomepage() {
  const region = useRegionContext();
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);

  const productsQuery = useProducts({
    page: 1,
    limit: PRODUCT_FETCH_LIMIT,
    fields: STOREFRONT_PRODUCT_CARD_FIELDS,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  });

  const { prefetchFirstPage, prefetchProducts } = usePrefetchProducts({
    cacheStrategy: "semiStatic",
    defaultDelay: 220,
  });
  const { delayedPrefetch, cancelPrefetch } = usePrefetchProduct({
    cacheStrategy: "semiStatic",
    defaultDelay: 160,
  });

  const cartQuery = useCart({
    autoCreate: true,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  });
  const addLineItem = useAddLineItem();

  const shouldShowProductSkeleton =
    productsQuery.products.length === 0 &&
    (!region?.region_id || productsQuery.isLoading);

  const preparedProductSections = useMemo(() => {
    return PRODUCT_SECTIONS.map((section, index) => {
      const sectionProducts = getSectionProducts(
        productsQuery.products,
        index * PRODUCTS_PER_GRID_SECTION,
        PRODUCTS_PER_GRID_SECTION,
      );

      return {
        ...section,
        products: sectionProducts,
      };
    });
  }, [productsQuery.products]);

  const recentProducts = useMemo(() => {
    return getSectionProducts(
      productsQuery.products,
      TOTAL_GRID_PRODUCTS,
      PRODUCTS_PER_GRID_SECTION,
    );
  }, [productsQuery.products]);

  useEffect(() => {
    if (!region?.region_id) {
      return;
    }

    void prefetchFirstPage(
      {
        page: 1,
        limit: PRODUCT_FETCH_LIMIT,
        fields: STOREFRONT_PRODUCT_CARD_FIELDS,
        region_id: region.region_id,
        country_code: region.country_code,
      },
      {
        prefetchedBy: "home-main",
      },
    );

    void prefetchProducts(
      {
        page: 2,
        limit: PRODUCT_FETCH_LIMIT,
        fields: STOREFRONT_PRODUCT_CARD_FIELDS,
        region_id: region.region_id,
        country_code: region.country_code,
      },
      {
        prefetchedBy: "home-next-page",
        skipMode: "any",
      },
    );
  }, [
    region?.country_code,
    region?.region_id,
    prefetchFirstPage,
    prefetchProducts,
  ]);

  useEffect(() => {
    if (!cartMessage) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setCartMessage(null);
    }, 3500);

    return () => clearTimeout(timeoutId);
  }, [cartMessage]);

  const handleAddToCart = async (product: HttpTypes.StoreProduct) => {
    setMutationError(null);
    setCartMessage(null);

    const variantId = product.variants?.[0]?.id;

    if (!region?.region_id) {
      setMutationError("Región sa ešte načítava. Skúste to prosím o chvíľu.");
      return;
    }

    if (!variantId) {
      setMutationError(
        "Produkt nemá dostupnú variantu pre vloženie do košíka.",
      );
      return;
    }

    try {
      setAddingVariantId(variantId);
      await addLineItem.mutateAsync({
        cartId: cartQuery.cart?.id,
        variantId,
        quantity: 1,
        autoCreate: true,
        region_id: region.region_id,
        country_code: region.country_code,
      });
      setCartMessage(`Pridané do košíka: ${product.title}`);
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "An unknown error occurred.",
      );
    } finally {
      setAddingVariantId(null);
    }
  };

  const handleProductHoverStart = (product: HttpTypes.StoreProduct) => {
    if (!product.handle) {
      return;
    }

    const prefetchId = `home-product-${product.id}`;
    delayedPrefetch(
      {
        handle: product.handle,
        fields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
        region_id: region?.region_id,
        country_code: region?.country_code,
      },
      120,
      prefetchId,
    );
  };

  const handleProductHoverEnd = (product: HttpTypes.StoreProduct) => {
    cancelPrefetch(`home-product-${product.id}`);
  };

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-700 px-400 py-550 lg:px-550 lg:py-700">
      <section className="rounded-2xl border border-border-secondary bg-surface p-300 shadow-sm">
        <Carousel.Root
          aspectRatio="none"
          className="w-full"
          loop
          slideCount={HERO_SLIDES.length}
          size="full"
        >
          <Carousel.Slides
            className="home-hero-slides"
            slides={HERO_SLIDES}
          />
          <Carousel.Previous className="-translate-y-1/2 absolute top-1/2 left-200 rounded-full border border-surface/80 bg-surface/85 p-200 text-xl text-fg-primary hover:bg-surface" />
          <Carousel.Next className="-translate-y-1/2 absolute top-1/2 right-200 rounded-full border border-surface/80 bg-surface/85 p-200 text-xl text-fg-primary hover:bg-surface" />
          <Carousel.Control className="absolute bottom-200 left-1/2 -translate-x-1/2 rounded-full bg-surface/85 px-300 py-200">
            <Carousel.Indicators className="gap-150" />
          </Carousel.Control>
        </Carousel.Root>
      </section>

      <section className="rounded-2xl border border-border-secondary bg-highlight p-300 md:p-400">
        <h2 className="mb-300 text-lg font-bold text-fg-primary">
          Čo vám Herbatika prináša
        </h2>
        <div className="grid grid-cols-2 gap-200 md:grid-cols-4 xl:grid-cols-8">
          {BENEFITS.map((benefit) => (
            <article
              className="rounded-lg border border-border-secondary bg-surface px-300 py-300"
              key={benefit.id}
            >
              <Icon
                className="mb-200 text-2xl text-primary"
                icon={benefit.icon}
              />
              <p className="text-xs leading-tight font-bold text-fg-primary">
                {benefit.title}
              </p>
              <p className="mt-100 text-2xs leading-snug text-fg-secondary">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {cartMessage && (
        <div className="flex">
          <Badge
            className="rounded-full px-300 py-100 text-xs font-semibold"
            variant="success"
          >
            {cartMessage}
          </Badge>
        </div>
      )}

      {mutationError && (
        <ErrorText className="text-sm" showIcon>
          {mutationError}
        </ErrorText>
      )}

      {productsQuery.error && (
        <ErrorText className="text-sm" showIcon>
          {productsQuery.error}
        </ErrorText>
      )}

      {preparedProductSections.slice(0, 2).map((section) => (
        <section className="space-y-400" id={section.id} key={section.id}>
          <header className="flex items-end justify-between gap-400">
            <div>
              <h2 className="text-2xl font-bold text-fg-primary">
                {section.title}
              </h2>
              <p className="mt-100 text-sm text-fg-secondary">
                {section.subtitle}
              </p>
            </div>
            <LinkButton
              as={NextLink}
              className="hidden rounded-md px-400 py-200 text-sm font-semibold md:inline-flex"
              href="/#"
              icon="icon-[mdi--arrow-right]"
              iconPosition="right"
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Zobraziť viac
            </LinkButton>
          </header>

          {shouldShowProductSkeleton ? (
            <HerbatikaProductGridSkeleton layout="home" />
          ) : section.products.length > 0 ? (
            <HerbatikaProductGrid
              isProductAdding={(product) =>
                addingVariantId === product.variants?.[0]?.id
              }
              keyPrefix={section.id}
              layout="home"
              onAddToCart={handleAddToCart}
              onProductHoverEnd={handleProductHoverEnd}
              onProductHoverStart={handleProductHoverStart}
              products={section.products}
            />
          ) : (
            <ExtraText className="text-sm text-fg-secondary">
              Produkty sa momentálne načítavajú.
            </ExtraText>
          )}
        </section>
      ))}

      <section className="space-y-400 rounded-2xl border border-border-secondary bg-surface p-400 md:p-550">
        <header className="flex items-end justify-between gap-400">
          <div>
            <h2 className="text-2xl font-bold text-fg-primary">
              Overené skúsenosti
            </h2>
            <p className="mt-100 text-sm text-fg-secondary">
              Skutočné hodnotenia od našich zákazníkov.
            </p>
          </div>
          <Badge
            className="rounded-full px-300 py-100 text-xs font-semibold"
            variant="info"
          >
            4.9 / 5
          </Badge>
        </header>

        <div className="grid grid-cols-1 gap-300 lg:grid-cols-3">
          {REVIEWS.map((review) => (
            <article
              className="rounded-2xl border border-border-secondary bg-base/70 p-400"
              key={review.id}
            >
              <Rating readOnly size="sm" value={review.rating} />
              <p className="mt-200 text-sm font-bold text-fg-primary">
                {review.title}
              </p>
              <p className="mt-200 text-sm leading-relaxed text-fg-secondary">
                {review.message}
              </p>
              <p className="mt-300 text-xs font-semibold text-primary">
                {review.author}
              </p>
            </article>
          ))}
        </div>
      </section>

      {preparedProductSections.slice(2).map((section) => (
        <section className="space-y-400" id={section.id} key={section.id}>
          <header className="flex items-end justify-between gap-400">
            <div>
              <h2 className="text-2xl font-bold text-fg-primary">
                {section.title}
              </h2>
              <p className="mt-100 text-sm text-fg-secondary">
                {section.subtitle}
              </p>
            </div>
            <LinkButton
              as={NextLink}
              className="hidden rounded-md px-400 py-200 text-sm font-semibold md:inline-flex"
              href="/#"
              icon="icon-[mdi--arrow-right]"
              iconPosition="right"
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Zobraziť viac
            </LinkButton>
          </header>

          {shouldShowProductSkeleton ? (
            <HerbatikaProductGridSkeleton layout="home" />
          ) : section.products.length > 0 ? (
            <HerbatikaProductGrid
              isProductAdding={(product) =>
                addingVariantId === product.variants?.[0]?.id
              }
              keyPrefix={section.id}
              layout="home"
              onAddToCart={handleAddToCart}
              onProductHoverEnd={handleProductHoverEnd}
              onProductHoverStart={handleProductHoverStart}
              products={section.products}
            />
          ) : (
            <ExtraText className="text-sm text-fg-secondary">
              Produkty sa momentálne načítavajú.
            </ExtraText>
          )}
        </section>
      ))}

      <section className="space-y-400" id="blog">
        <header className="flex items-end justify-between gap-400">
          <div>
            <h2 className="text-2xl font-bold text-fg-primary">
              Blog o zdravom životnom štýle
            </h2>
            <p className="mt-100 text-sm text-fg-secondary">
              Nové články o prírode, vitalite a každodennej rovnováhe.
            </p>
          </div>
          <LinkButton
            as={NextLink}
            className="hidden rounded-md px-400 py-200 text-sm font-semibold md:inline-flex"
            href="/blog"
            icon="icon-[mdi--open-in-new]"
            iconPosition="right"
            size="sm"
            theme="outlined"
            variant="secondary"
          >
            Všetky články
          </LinkButton>
        </header>

        <div className="grid grid-cols-1 gap-400 lg:grid-cols-3">
          {BLOG_POSTS.map((post) => (
            <article
              className="overflow-hidden rounded-2xl border border-border-secondary bg-surface shadow-sm"
              key={post.id}
            >
              <Link as={NextLink} className="block" href={post.href}>
                <Image
                  alt={post.title}
                  className="home-blog-card-image w-full object-cover"
                  src={post.imageSrc}
                />
              </Link>
              <div className="space-y-200 p-400">
                <h3 className="line-clamp-2 text-sm leading-snug font-bold text-fg-primary">
                  <Link
                    as={NextLink}
                    className="hover:text-primary"
                    href={post.href}
                  >
                    {post.title}
                  </Link>
                </h3>
                <p className="line-clamp-3 text-sm text-fg-secondary">
                  {post.excerpt}
                </p>
                <LinkButton
                  as={NextLink}
                  className="rounded-md px-300 py-200 text-xs font-semibold"
                  href={post.href}
                  icon="icon-[mdi--arrow-right]"
                  iconPosition="right"
                  size="sm"
                  theme="light"
                  variant="secondary"
                >
                  Čítať článok
                </LinkButton>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-promo-grid grid gap-400 rounded-2xl border border-border-secondary bg-surface p-400 md:p-550">
        <div className="overflow-hidden rounded-2xl border border-border-secondary">
          <Image
            alt="Predajňa Herbatika"
            className="home-promo-image h-full w-full object-cover"
            src="https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&w=1100&q=80"
          />
        </div>

        <div className="flex flex-col justify-center gap-300">
          <Badge
            className="w-fit rounded-full px-300 py-100 text-xs font-semibold"
            variant="secondary"
          >
            Spoja nás láska k prírode
          </Badge>
          <h2 className="text-2xl leading-tight font-bold text-fg-primary">
            Prírodná kozmetika, doplnky výživy a tradičná medicína
          </h2>
          <p className="text-sm leading-relaxed text-fg-secondary">
            Starostlivo vyberáme produkty, ktoré podporujú zdravie prirodzenou
            cestou. V ponuke nájdete výživové doplnky, bylinky aj kozmetiku pre
            každodennú rovnováhu.
          </p>
          <LinkButton
            as={NextLink}
            className="w-fit rounded-md px-400 py-200 text-sm font-semibold"
            href="/#"
            icon="icon-[mdi--arrow-right]"
            iconPosition="right"
            size="sm"
            variant="primary"
          >
            Objaviť ponuku
          </LinkButton>
        </div>
      </section>

      <section className="space-y-400" id="naposledy-navstivene">
        <header>
          <h2 className="text-2xl font-bold text-fg-primary">
            Naposledy navštívené
          </h2>
          <p className="mt-100 text-sm text-fg-secondary">
            Produkty, ktoré ste si naposledy prezerali.
          </p>
        </header>

        {shouldShowProductSkeleton ? (
          <div className="grid grid-cols-2 gap-300 md:grid-cols-4">
            {RECENT_PRODUCT_SKELETON_KEYS.map((skeletonKey) => (
              <div
                className="rounded-xl border border-border-secondary bg-surface p-300"
                key={skeletonKey}
              >
                <Skeleton.Rectangle className="h-900 rounded-lg" />
                <Skeleton.Text className="mt-200" noOfLines={2} size="sm" />
              </div>
            ))}
          </div>
        ) : recentProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-300 md:grid-cols-4">
            {recentProducts.map((product, index) => (
              <Link
                as={NextLink}
                className="rounded-xl border border-border-secondary bg-surface p-300 hover:border-primary/30"
                href={product.handle ? `/p/${product.handle}` : "/#"}
                key={`recent-product-${product.id}-${index}`}
              >
                <Image
                  alt={product.title || "Produkt"}
                  className="h-900 w-full rounded-lg border border-border-secondary object-cover"
                  src={product.thumbnail || "/file.svg"}
                />
                <p className="mt-200 line-clamp-2 text-sm leading-snug font-semibold text-fg-primary">
                  {product.title}
                </p>
                <p className="mt-100 text-sm font-bold text-primary">
                  {getProductPriceLabel(product)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <ExtraText className="text-sm text-fg-secondary">
            Zatiaľ nemáte žiadne naposledy navštívené produkty.
          </ExtraText>
        )}
      </section>
    </main>
  );
}
