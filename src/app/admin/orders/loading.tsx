import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminOrdersLoading() {
  return (
    <StoreLoadingView
      title="Заказы"
      subtitle="Загружаем заказы"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
