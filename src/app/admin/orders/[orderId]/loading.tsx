import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminOrderDetailLoading() {
  return (
    <StoreLoadingView
      title="Order Detail"
      subtitle="Loading order snapshot"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
