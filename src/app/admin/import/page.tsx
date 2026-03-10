import { AdminScreen } from '@/components/admin/AdminScreen';
import adminStyles from '@/components/admin/admin.module.css';
import { StoreSection } from '@/components/store/StoreSection';

export default function AdminImportPage() {
  return (
    <AdminScreen title="Catalog Import" subtitle="Prepared entry point for bulk imports">
      <StoreSection title="Import module placeholder">
        <section className={adminStyles.adminCard}>
          <h2 className={adminStyles.adminCardTitle}>Planned file formats</h2>
          <p className={adminStyles.adminCardSub}>XLSX, XLS, XLSM, XLTX</p>
          <p className={adminStyles.adminCardSub}>
            This screen is reserved for the next roadmap wave with parsing,
            validation, and bulk updates for products and images.
          </p>
          <p className={adminStyles.adminCardSub}>
            Current release keeps this page as a clean placeholder without fake upload flow.
          </p>
        </section>
      </StoreSection>
    </AdminScreen>
  );
}
