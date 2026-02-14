import { RegionProvider } from "@techsio/storefront-data/shared";
import { connection } from "next/server";
import { Suspense } from "react";
import { HerbatikaHomepage } from "@/components/herbatika-homepage";
import { StorefrontHydrationBoundary } from "@/components/storefront-hydration-boundary";
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr";

function HomePageFallback() {
  return <main className="mx-auto min-h-[40dvh] w-full max-w-(--breakpoint-2xl)" />;
}

async function HomePageContent() {
  await connection();
  const { dehydratedState, region } = await prefetchHomePageStorefrontData();

  return (
    <StorefrontHydrationBoundary state={dehydratedState}>
      <RegionProvider region={region}>
        <HerbatikaHomepage />
      </RegionProvider>
    </StorefrontHydrationBoundary>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageFallback />}>
      <HomePageContent />
    </Suspense>
  );
}
