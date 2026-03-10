import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminDiscountsLoading() {
  return (
    <StoreLoadingView
      title="Admin Discounts"
      subtitle="Loading discount workspace"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
