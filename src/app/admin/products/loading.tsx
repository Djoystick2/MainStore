import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminProductsLoading() {
  return (
    <StoreLoadingView
      title="Товары"
      subtitle="Загружаем список товаров"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
