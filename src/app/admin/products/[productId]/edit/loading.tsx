import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminEditProductLoading() {
  return (
    <StoreLoadingView
      title="Карточка товара"
      subtitle="Загружаем детали товара"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
