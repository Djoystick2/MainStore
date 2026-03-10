import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function FavoritesLoading() {
  return (
    <StoreLoadingView
      title="Favorites"
      subtitle="Loading favorites"
      back={false}
      showBottomNav={true}
      mode="catalog"
    />
  );
}
