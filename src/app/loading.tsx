import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function HomeLoading() {
  return (
    <StoreLoadingView
      title="Главная"
      subtitle="Загружаем витрину"
      back={false}
      showBottomNav={true}
      mode="home"
    />
  );
}
