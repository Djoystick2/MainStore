import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminEditProductLoading() {
  return (
    <StoreLoadingView
      title="Edit Product"
      subtitle="Loading product details"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
