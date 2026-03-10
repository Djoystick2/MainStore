import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminImportLoading() {
  return (
    <StoreLoadingView
      title="Импорт каталога"
      subtitle="Подготавливаем импорт"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
