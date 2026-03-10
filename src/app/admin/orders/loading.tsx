import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminOrdersLoading() {
  return (
    <StoreLoadingView
      title="Admin Orders"
      subtitle="Loading orders"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
