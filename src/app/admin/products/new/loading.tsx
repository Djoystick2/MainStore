import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminCreateProductLoading() {
  return (
    <StoreLoadingView
      title="Создание товара"
      subtitle="Загружаем форму товара"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
