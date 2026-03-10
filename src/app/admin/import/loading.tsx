import { StoreLoadingView } from '@/components/store/StoreLoadingView';

export default function AdminImportLoading() {
  return (
    <StoreLoadingView
      title="Catalog Import"
      subtitle="Loading import scaffold"
      back={true}
      showBottomNav={false}
      mode="admin"
    />
  );
}
