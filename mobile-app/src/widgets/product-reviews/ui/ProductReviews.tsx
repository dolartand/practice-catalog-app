import { Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { formatReviewDate } from '../lib/format-review-date';

import type { Product } from '@entities/product';
import { useReviewStore } from '@stores/reviewStore';
import { useSessionStore } from '@stores/sessionStore';
import type { PublicReview, MyReview } from '@stores/reviewStore';
import { DeleteReviewButton } from '@features/delete-review';
import { EditReviewForm } from '@features/edit-review';
import { WriteReviewForm } from '@features/write-review';
import { showToast } from '@shared/lib';


export const ProductReviews = ({ product }: { product: Product }) => {
  const { t } = useTranslation();
  const [isWriting, setIsWriting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const isLoading = useReviewStore((s) => s.isLoading);
  const isLoadingMore = useReviewStore((s) => s.isLoadingMore);
  const error = useReviewStore((s) => s.error);
  const items = useReviewStore((s) => s.items);
  const hasMore = useReviewStore((s) => s.hasMore);
  const productId = useReviewStore((s) => s.productId);
  const total = useReviewStore((s) => s.total);
  const myReview = useReviewStore((s) => s.getMyReview(product.id));
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);

  useEffect(() => {
    useReviewStore.getState().fetch(product.id);
  }, [product.id]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('review.section_title')}</Text>

      <Summary ratingAverage={product.ratingAverage} ratingCount={product.ratingCount} />

      {!isAuthenticated && <GuestHint />}

      {isAuthenticated && !myReview && !isWriting && (
        <Pressable
          style={({ pressed }) => [styles.writeButton, pressed && { opacity: 0.85 }]}
          onPress={() => setIsWriting(true)}
        >
          <Text style={styles.writeButtonText}>{t('review.write_button')}</Text>
        </Pressable>
      )}
      {isAuthenticated && !myReview && isWriting && (
        <WriteReviewForm productId={product.id} onDone={() => setIsWriting(false)} onCancel={() => setIsWriting(false)} />
      )}

      {isAuthenticated && myReview && !isEditing && (
        <MyReviewCard review={myReview} onEdit={() => setIsEditing(true)} />
      )}
      {isAuthenticated && myReview && isEditing && (
        <EditReviewForm review={myReview} onDone={() => setIsEditing(false)} onCancel={() => setIsEditing(false)} />
      )}

      <List
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        error={error}
        items={items}
        hasMore={hasMore}
        productId={productId}
        total={total}
      />
    </View>
  );
};

const Summary = ({ ratingAverage, ratingCount }: { ratingAverage: number; ratingCount: number }) => {
  const { t } = useTranslation();
  if (ratingCount === 0) return null;
  return (
    <View style={styles.summaryRow}>
      <Stars value={Math.round(ratingAverage)} />
      <Text style={styles.summaryText}>
        {ratingAverage.toFixed(1)} · {t('product.reviews_count', { count: ratingCount })}
      </Text>
    </View>
  );
};

const GuestHint = () => {
  const { t } = useTranslation();
  return (
    <Pressable hitSlop={4} onPress={() => showToast(t('review.login_required'))}>
      <Text style={styles.guestHint}>{t('review.login_required')}</Text>
    </Pressable>
  );
};

const Stars = ({ value }: { value: number }) => {
  const { theme } = useUnistyles();
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={13}
          color={star <= value ? theme.colors.star : theme.colors.border}
          fill={star <= value ? theme.colors.star : 'transparent'}
        />
      ))}
    </View>
  );
};

const StatusChip = ({ moderated }: { moderated: boolean }) => {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const color = moderated ? theme.colors.success : theme.colors.accent;
  return (
    <Text style={[styles.chip, { color, backgroundColor: `${color}18` }]}>
      {t(moderated ? 'review.status_published' : 'review.status_pending')}
    </Text>
  );
};

const MyReviewCard = ({ review, onEdit }: { review: MyReview; onEdit: () => void }) => {
  const { t, i18n } = useTranslation();

  return (
    <View style={[styles.card, styles.myCard]}>
      <View style={styles.cardHeader}>
        <Text style={styles.author}>{t('review.my_review_title')}</Text>
        <StatusChip moderated={review.moderated} />
      </View>
      <View style={styles.cardMeta}>
        <Stars value={review.rating} />
        <Text style={styles.date}>{formatReviewDate(review.createdAt, i18n.language)}</Text>
      </View>
      {review.text && <Text style={styles.text}>{review.text}</Text>}
      <View style={styles.myActions}>
        <Pressable
          style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.7 }]}
          onPress={onEdit}
        >
          <Text style={styles.editButtonText}>{t('review.edit_action')}</Text>
        </Pressable>
        <DeleteReviewButton productId={review.productId} onDeleted={() => {}} />
      </View>
    </View>
  );
};

const ReviewRow = ({ review, locale }: { review: PublicReview; locale: string }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={styles.cardMeta}>
        <Text style={styles.author}>{review.userFirstName ?? t('review.anonymous')}</Text>
        <Text style={styles.date}>{formatReviewDate(review.createdAt, locale)}</Text>
      </View>
      <Stars value={review.rating} />
      {review.text && <Text style={styles.text}>{review.text}</Text>}
    </View>
  );
};

const List = ({
  isLoading,
  isLoadingMore,
  error,
  items,
  hasMore,
  productId,
  total,
}: {
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  items: PublicReview[];
  hasMore: boolean;
  productId: string | null;
  total: number;
}) => {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const myId = productId ? useReviewStore.getState().getMyReview(productId)?.id : undefined;
  const visibleItems = myId
    ? items.filter((item) => item.id !== myId)
    : items;

  if (isLoading && items.length === 0) {
    return (
      <View style={styles.listCentered}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.listCentered}>
        <Text style={styles.emptyText}>{t(`errors.${error}`)}</Text>
        {productId && (
          <Pressable onPress={() => useReviewStore.getState().fetch(productId!)}>
            <Text style={styles.showMore}>{t('common.retry')}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (visibleItems.length === 0 && !myId) {
    if (total === 0 && !error) {
      return <Text style={styles.emptyText}>{t('review.empty')}</Text>;
    }
    return null;
  }

  return (
    <View style={styles.listContainer}>
      {visibleItems.map((review) => (
        <ReviewRow key={review.id} review={review} locale={i18n.language} />
      ))}

      {hasMore && (
        <Pressable style={({ pressed }) => [styles.showMoreButton, pressed && { opacity: 0.8 }]} onPress={() => useReviewStore.getState().fetchMore()}>
          {isLoadingMore ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <Text style={styles.showMore}>{t('review.show_more')}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.gap(1.5),
    gap: theme.gap(1.25),
  },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: theme.gap(1) },
  summaryText: { fontSize: 13, color: theme.colors.textSecondary },
  starsRow: { flexDirection: 'row', gap: 2 },
  guestHint: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  writeButton: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  writeButtonText: { color: theme.colors.primary, fontWeight: '700', fontSize: 15 },
  card: {
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.gap(1.25),
    gap: theme.gap(0.75),
  },
  myCard: { borderColor: `${theme.colors.primary}55` },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.gap(1) },
  author: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  chip: { fontSize: 11, fontWeight: '700', borderRadius: 8, paddingHorizontal: theme.gap(1), paddingVertical: 2, overflow: 'hidden' },
  date: { fontSize: 12, color: theme.colors.textSecondary },
  text: { fontSize: 14, lineHeight: 20, color: theme.colors.text },
  myActions: { flexDirection: 'row', gap: theme.gap(1), marginTop: theme.gap(0.5) },
  editButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: { color: theme.colors.primary, fontWeight: '600', fontSize: 14 },
  listContainer: { gap: theme.gap(1) },
  listCentered: { alignItems: 'center', gap: theme.gap(1), paddingVertical: theme.gap(1) },
  emptyText: { fontSize: 13, color: theme.colors.textSecondary },
  showMoreButton: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  showMore: { color: theme.colors.primary, fontWeight: '600', fontSize: 14 },
}));