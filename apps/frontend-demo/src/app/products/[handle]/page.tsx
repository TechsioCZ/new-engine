import ProductDetail from "./product-detail"

// Enable ISR with 60 second revalidation
export const revalidate = 60

// Don't pre-generate any products at build time
// They will be generated on-demand
const generateStaticParams = () => []

const ProductDetailPage = async ({
  params,
}: {
  params: Promise<{ handle: string }>
}) => {
  const resolvedParams = await params

  return <ProductDetail handle={resolvedParams.handle} />
}

export { generateStaticParams }
export default ProductDetailPage
