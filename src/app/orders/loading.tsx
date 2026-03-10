import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function OrdersLoading() {
  return (
    <StoreLoadingView
      title="Мои заказы"
      subtitle="Загружаем историю заказов"
      back={false}
      showBottomNav={true}
      mode="orders"
    />
  );
}
