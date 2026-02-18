import { connection } from "next/server";
import { Suspense } from "react";
import { HerbatikaHomepage } from "@/components/herbatika-homepage";
import { StorefrontHydrationBoundary } from "@/components/storefront-hydration-boundary";
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr";

function HomePageFallback() {
  return <main className="mx-auto min-h-dvh w-full max-w-max-w" />;
}

async function HomePageContent() {
  await connection();
  const { dehydratedState } = await prefetchHomePageStorefrontData();

  return (
    <StorefrontHydrationBoundary state={dehydratedState}>
      <HerbatikaHomepage />
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
