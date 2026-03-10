import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminLoading() {
  return (
    <StoreLoadingView
      title="Админка"
      subtitle="Загружаем рабочую область"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
