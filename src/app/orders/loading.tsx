import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function OrdersLoading() {
  return (
    <StoreLoadingView
      title="My Orders"
      subtitle="Loading order history"
      back={false}
      showBottomNav={true}
      mode="orders"
    />
  );
}
