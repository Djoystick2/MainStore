import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function ProfileLoading() {
  return (
    <StoreLoadingView
      title="Профиль"
      subtitle="Загружаем профиль"
      back={false}
      showBottomNav={true}
      mode="orders"
    />
  );
}
