import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function ProductLoading() {
  return (
    <StoreLoadingView
      title="Товар"
      subtitle="Загружаем карточку товара"
      back={true}
      showBottomNav={false}
      mode="product"
    />
  );
}
