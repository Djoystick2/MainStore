import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function CatalogLoading() {
  return (
    <StoreLoadingView
      title="Catalog"
      subtitle="Loading products"
      back={false}
      showBottomNav={true}
      mode="catalog"
    />
  );
}
