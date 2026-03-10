import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function OrderDetailLoading() {
  return (
    <StoreLoadingView
      title="Заказ"
      subtitle="Загружаем детали заказа"
      back={true}
      showBottomNav={true}
      mode="orders"
    />
  );
}
