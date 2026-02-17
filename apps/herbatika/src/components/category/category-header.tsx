import { Badge } from "@techsio/ui-kit/atoms/badge";

type CategoryHeaderProps = {
  title: string;
  categoryFound: boolean;
  categorySubtitle: string;
  totalProducts: number;
  activeAsideFilterCount: number;
  displayedProductsCount: number;
};

export function CategoryHeader({
  title,
  categoryFound,
  categorySubtitle,
  totalProducts,
  activeAsideFilterCount,
  displayedProductsCount,
}: CategoryHeaderProps) {
  return (
    <header className="space-y-200">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="flex flex-wrap gap-200">
        <Badge variant={categoryFound ? "success" : "warning"}>
          {categoryFound ? "kategória nájdená" : "kategória nenájdená"}
        </Badge>
        <Badge variant="info">{categorySubtitle}</Badge>
        <Badge variant="info">{`produkty: ${totalProducts}`}</Badge>
        {activeAsideFilterCount > 0 && (
          <Badge variant="warning">{`po filtri: ${displayedProductsCount}`}</Badge>
        )}
      </div>
    </header>
  );
}
