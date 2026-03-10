import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminCategoriesLoading() {
  return (
    <StoreLoadingView
      title="Категории"
      subtitle="Загружаем категории"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
