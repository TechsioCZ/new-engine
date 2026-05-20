import type { HttpTypes } from "@medusajs/types";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BlogDetailPage } from "@/components/blog/blog-detail-page";
import {
  resolveBlogPostBySlug,
  resolveBlogRecommendedProductsConfig,
  resolveRelatedBlogPosts,
} from "@/lib/storefront/blog-content";
import {
  buildCategoryListParams,
  STOREFRONT_CATEGORY_TREE_FIELDS,
  STOREFRONT_CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config";
import { fetchCmsBlogPost, fetchCmsBlogPosts } from "@/lib/storefront/cms";
import {
  buildProductListParams,
  STOREFRONT_PRODUCT_CARD_FIELDS,
} from "@/lib/storefront/product-query-config";
import { selectRecommendedProductRepresentatives } from "@/lib/storefront/recommended-product-families";
import { getRegionServerContext } from "@/lib/storefront/ssr/context";
import {
  fetchServerCategories,
  fetchServerProducts,
} from "@/lib/storefront/storefront-server";

type BlogDetailRouteProps = PageProps<"/blog/[slug]">;

function BlogDetailPageFallback() {
  return <main className="mx-auto min-h-dvh w-full max-w-max-w" />;
}

async function resolveRecommendedProductsForBlogPost(
  slug: string,
): Promise<HttpTypes.StoreProduct[]> {
  const recommendationConfig = resolveBlogRecommendedProductsConfig(slug);
  if (!recommendationConfig) {
    return [];
  }

  const { queryClient, region } = await getRegionServerContext();
  const categoryResponse = await fetchServerCategories(
    queryClient,
    buildCategoryListParams({
      page: 1,
      limit: STOREFRONT_CATEGORY_TREE_LIMIT,
      fields: STOREFRONT_CATEGORY_TREE_FIELDS,
    }),
  );

  const recommendedCategoryIds = recommendationConfig.categoryHandles
    .map((handle) => {
      return categoryResponse.categories.find(
        (category) => category.handle === handle,
      )?.id;
    })
    .filter(
      (categoryId): categoryId is string => typeof categoryId === "string",
    );

  if (recommendedCategoryIds.length === 0) {
    return [];
  }

  const recommendedProductsLimit = Math.min(
    Math.max(recommendationConfig.limit ?? 8, 1),
    10,
  );
  const recommendedProductsCandidateLimit = Math.min(
    Math.max(recommendedProductsLimit * 4, 24),
    40,
  );
  const productResponse = await fetchServerProducts(
    queryClient,
    buildProductListParams({
      page: 1,
      limit: recommendedProductsCandidateLimit,
      fields: STOREFRONT_PRODUCT_CARD_FIELDS,
      order: "-created_at",
      category_id: recommendedCategoryIds,
      region_id: region?.region_id,
      country_code: region?.country_code,
    }),
  );

  return selectRecommendedProductRepresentatives(
    productResponse.products,
    recommendedProductsLimit,
  );
}

async function BlogDetailPageContent({ params }: BlogDetailRouteProps) {
  await connection();
  const { slug } = await params;
  const cmsPost = await fetchCmsBlogPost(slug);
  const post = cmsPost ?? resolveBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const cmsRelatedPosts = cmsPost ? await fetchCmsBlogPosts() : [];
  const relatedPosts = resolveRelatedBlogPosts(
    post.slug,
    4,
    cmsRelatedPosts.length > 1 ? cmsRelatedPosts : undefined,
  );
  const recommendedProducts = await resolveRecommendedProductsForBlogPost(
    post.slug,
  );
  const sidebarFeaturedProduct = recommendedProducts[0] ?? null;
  const inlineRecommendedProducts = recommendedProducts.slice(1);

  return (
    <BlogDetailPage
      post={post}
      recommendedProducts={inlineRecommendedProducts}
      relatedPosts={relatedPosts}
      sidebarFeaturedProduct={sidebarFeaturedProduct}
    />
  );
}

export default function BlogDetailPageRoute(props: BlogDetailRouteProps) {
  return (
    <Suspense fallback={<BlogDetailPageFallback />}>
      <BlogDetailPageContent {...props} />
    </Suspense>
  );
}
