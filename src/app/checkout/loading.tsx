import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function CheckoutLoading() {
  return (
    <StoreLoadingView
      title="Checkout"
      subtitle="Loading checkout details"
      back={true}
      showBottomNav={true}
      mode="cart"
    />
  );
}
