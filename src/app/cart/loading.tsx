import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function CartLoading() {
  return (
    <StoreLoadingView
      title="Корзина"
      subtitle="Загружаем корзину"
      back={false}
      showBottomNav={true}
      mode="cart"
    />
  );
}
