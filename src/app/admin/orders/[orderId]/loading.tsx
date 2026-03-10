import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminOrderDetailLoading() {
  return (
    <StoreLoadingView
      title="Заказ"
      subtitle="Загружаем снимок заказа"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
