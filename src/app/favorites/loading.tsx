import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function FavoritesLoading() {
  return (
    <StoreLoadingView
      title="Избранное"
      subtitle="Загружаем избранное"
      back={false}
      showBottomNav={true}
      mode="catalog"
    />
  );
}
