import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminLoading() {
  return (
    <StoreLoadingView
      title="Admin"
      subtitle="Loading admin workspace"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
