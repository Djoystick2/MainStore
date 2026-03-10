import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function CatalogLoading() {
  return (
    <StoreLoadingView
      title="Каталог"
      subtitle="Загружаем товары"
      back={false}
      showBottomNav={true}
      mode="catalog"
    />
  );
}
