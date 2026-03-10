import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function ProfileLoading() {
  return (
    <StoreLoadingView
      title="Profile"
      subtitle="Loading profile"
      back={false}
      showBottomNav={true}
      mode="orders"
    />
  );
}
