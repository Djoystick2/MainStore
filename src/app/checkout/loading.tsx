import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function CheckoutLoading() {
  return (
    <StoreLoadingView
      title="Оформление"
      subtitle="Загружаем оформление"
      back={true}
      showBottomNav={true}
      mode="cart"
    />
  );
}
