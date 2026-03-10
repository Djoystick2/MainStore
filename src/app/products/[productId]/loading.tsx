import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function ProductLoading() {
  return (
    <StoreLoadingView
      title="Product"
      subtitle="Loading product details"
      back={true}
      showBottomNav={false}
      mode="product"
    />
  );
}
