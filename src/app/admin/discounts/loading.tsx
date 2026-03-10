import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminDiscountsLoading() {
  return (
    <StoreLoadingView
      title="Скидки"
      subtitle="Загружаем раздел скидок"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
