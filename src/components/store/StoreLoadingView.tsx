import { StoreScreen } from './StoreScreen';
import styles from './store.module.css';

interface StoreLoadingViewProps {
  title: string;
  subtitle: string;
  back?: boolean;
  showBottomNav?: boolean;
  mode?: 'home' | 'catalog' | 'product' | 'cart' | 'orders' | 'admin' | 'default';
}

export function StoreLoadingView({
  title,
  subtitle,
  back = false,
  showBottomNav = true,
  mode = 'default',
}: StoreLoadingViewProps) {
  const renderLoadingContent = () => {
    if (mode === 'home') {
      return (
        <>
          <div className={`${styles.loadingBlock} ${styles.loadingHero}`} />
          <div className={styles.loadingInlineGrid}>
            <div className={`${styles.loadingBlock} ${styles.loadingGridCell}`} />
            <div className={`${styles.loadingBlock} ${styles.loadingGridCell}`} />
          </div>
          <div className={`${styles.loadingBlock} ${styles.loadingSection}`} />
        </>
      );
    }

    if (mode === 'catalog') {
      return (
        <>
          <div className={`${styles.loadingBlock} ${styles.loadingBar}`} />
          <div className={styles.loadingChipRow}>
            <div className={`${styles.loadingBlock} ${styles.loadingChip}`} />
            <div className={`${styles.loadingBlock} ${styles.loadingChip}`} />
            <div className={`${styles.loadingBlock} ${styles.loadingChip} ${styles.loadingChipWide}`} />
          </div>
          <div className={styles.loadingProductGrid}>
            <div className={`${styles.loadingBlock} ${styles.loadingProductCard}`} />
            <div className={`${styles.loadingBlock} ${styles.loadingProductCard}`} />
          </div>
        </>
      );
    }

    if (mode === 'product') {
      return (
        <>
          <div className={`${styles.loadingBlock} ${styles.loadingSection}`} />
          <div className={`${styles.loadingBlock} ${styles.loadingBar}`} />
          <div className={`${styles.loadingBlock} ${styles.loadingStickyBar}`} />
        </>
      );
    }

    if (mode === 'cart' || mode === 'orders' || mode === 'admin') {
      return (
        <>
          <div className={`${styles.loadingBlock} ${styles.loadingBar}`} />
          <div className={styles.loadingCardList}>
            <div className={`${styles.loadingBlock} ${styles.loadingCardItem}`} />
            <div className={`${styles.loadingBlock} ${styles.loadingCardItem}`} />
          </div>
        </>
      );
    }

    return (
      <>
        <div className={`${styles.loadingBlock} ${styles.loadingHero}`} />
        <div className={`${styles.loadingBlock} ${styles.loadingBar}`} />
        <div className={`${styles.loadingBlock} ${styles.loadingSection}`} />
      </>
    );
  };

  return (
    <StoreScreen
      title={title}
      subtitle={subtitle}
      back={back}
      showBottomNav={showBottomNav}
    >
      {renderLoadingContent()}
    </StoreScreen>
  );
}
