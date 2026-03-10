import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminProductsLoading() {
  return (
    <StoreLoadingView
      title="Admin Products"
      subtitle="Loading product list"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
