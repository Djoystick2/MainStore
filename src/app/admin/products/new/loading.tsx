import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminCreateProductLoading() {
  return (
    <StoreLoadingView
      title="Create Product"
      subtitle="Loading product form"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
