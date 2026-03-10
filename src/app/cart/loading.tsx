import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function CartLoading() {
  return (
    <StoreLoadingView
      title="Cart"
      subtitle="Loading cart"
      back={false}
      showBottomNav={true}
      mode="cart"
    />
  );
}
