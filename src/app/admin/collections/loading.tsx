import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminCollectionsLoading() {
  return (
    <StoreLoadingView
      title="Подборки"
      subtitle="Загружаем подборки"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
