import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function OrderDetailLoading() {
  return (
    <StoreLoadingView
      title="Order"
      subtitle="Loading order details"
      back={true}
      showBottomNav={true}
      mode="orders"
    />
  );
}
