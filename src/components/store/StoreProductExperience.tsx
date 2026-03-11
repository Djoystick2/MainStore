'use client';

import { useState } from 'react';

import { classNames } from '@/css/classnames';

import styles from './store.module.css';
import type { StoreProductPresentation } from './types';

interface StoreProductExperienceProps {
  presentation: StoreProductPresentation;
}

function Stars({ rating }: { rating: number }) {
  return <span aria-hidden="true">{'★'.repeat(rating)}{'☆'.repeat(Math.max(0, 5 - rating))}</span>;
}

export function StoreProductExperience({ presentation }: StoreProductExperienceProps) {
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      presentation.optionGroups
        .filter((group) => group.values[0])
        .map((group) => [group.id, group.values[0].id]),
    ),
  );
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);

  return (
    <>
      {presentation.optionGroups.length > 0 ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Подберите вариант</h2>
          <div className={styles.optionGroupStack}>
            {presentation.optionGroups.map((group) => (
              <div key={group.id} className={styles.optionGroup}>
                <div className={styles.optionGroupHead}>
                  <p className={styles.optionGroupTitle}>{group.title}</p>
                  {group.helperText ? <p className={styles.optionGroupHint}>{group.helperText}</p> : null}
                </div>
                <div className={styles.optionValueRow}>
                  {group.values.map((value) => {
                    const isActive = selectedValues[group.id] === value.id;

                    return (
                      <button
                        key={value.id}
                        type="button"
                        className={classNames(styles.optionValueButton, isActive && styles.optionValueButtonActive)}
                        onClick={() =>
                          setSelectedValues((current) => ({
                            ...current,
                            [group.id]: value.id,
                          }))
                        }
                      >
                        {value.swatch ? (
                          <span className={styles.optionSwatch} style={{ background: value.swatch }} aria-hidden="true" />
                        ) : null}
                        <span>{value.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className={styles.reviewNote}>
            Выбор варианта помогает быстрее сориентироваться на витрине. Корзина пока добавляет базовую карточку товара без отдельной модели вариантов.
          </p>
        </section>
      ) : null}

      {presentation.sizeGuide && presentation.sizeGuide.length > 0 ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Размерная сетка</h2>
          <div className={styles.sizeGuideTable}>
            <div className={classNames(styles.sizeGuideRow, styles.sizeGuideHead)}>
              <span>Размер</span>
              <span>Обхват</span>
              <span>Пояс / EU</span>
              <span>Посадка</span>
            </div>
            {presentation.sizeGuide.map((row) => (
              <div key={row.size} className={styles.sizeGuideRow}>
                <span>{row.size}</span>
                <span>{row.chest}</span>
                <span>{row.waist}</span>
                <span>{row.fit}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.specsCardHead}>
          <div>
            <h2 className={styles.panelTitle}>Характеристики</h2>
            <p className={styles.panelText}>Короткий обзор состава, сценария и служебных деталей товара.</p>
          </div>
          <button
            type="button"
            className={classNames(styles.secondaryButton, styles.actionButtonReset, styles.specsTrigger)}
            onClick={() => setIsSpecsOpen(true)}
          >
            Открыть полностью
          </button>
        </div>
        <div className={styles.specsPreviewGrid}>
          {presentation.specificationGroups.slice(0, 2).map((group) => (
            <div key={group.id} className={styles.specsPreviewCard}>
              <p className={styles.specsPreviewTitle}>{group.title}</p>
              {group.items.slice(0, 3).map((item) => (
                <div key={`${group.id}-${item.label}`} className={styles.specsPreviewItem}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Отзывы</h2>
        <p className={styles.panelText}>{presentation.reviewsLabel}</p>
        <div className={styles.reviewRail}>
          {presentation.reviews.map((review) => (
            <article key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewCardHead}>
                <div>
                  <p className={styles.reviewAuthor}>{review.author}</p>
                  <p className={styles.reviewMeta}>{review.meta}</p>
                </div>
                <p className={styles.reviewStars}><Stars rating={review.rating} /></p>
              </div>
              <p className={styles.reviewTitle}>{review.title}</p>
              <p className={styles.reviewText}>{review.text}</p>
            </article>
          ))}
        </div>
        {presentation.reviewNote ? <p className={styles.reviewNote}>{presentation.reviewNote}</p> : null}
      </section>

      {isSpecsOpen ? (
        <div className={styles.specsOverlay} role="dialog" aria-modal="true" aria-label="Характеристики товара">
          <div className={styles.specsModal}>
            <div className={styles.specsModalHead}>
              <div>
                <p className={styles.specsModalEyebrow}>Товар</p>
                <h2 className={styles.panelTitle}>Характеристики</h2>
              </div>
              <button
                type="button"
                className={classNames(styles.secondaryButton, styles.actionButtonReset, styles.specsCloseButton)}
                onClick={() => setIsSpecsOpen(false)}
              >
                Закрыть
              </button>
            </div>
            <div className={styles.specsGroupStack}>
              {presentation.specificationGroups.map((group) => (
                <section key={group.id} className={styles.specsGroup}>
                  <p className={styles.specsGroupTitle}>{group.title}</p>
                  <div className={styles.specsList}>
                    {group.items.map((item) => (
                      <div key={`${group.id}-${item.label}`} className={styles.specsListItem}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
