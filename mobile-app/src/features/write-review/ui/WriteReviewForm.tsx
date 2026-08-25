import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { reviewErrorToastKey, reviewStore, type MyReview } from '@entities/review';
import { REVIEW_TEXT_MAX_LENGTH, showToast } from '@shared/lib';
import { StarRatingInput } from '@shared/ui';
import { FormField } from '@shared/ui/form-field/FormField';

const MAX_TEXT_LENGTH = REVIEW_TEXT_MAX_LENGTH;

interface WriteReviewFormProps {
  productId: string;
  onDone: (review: MyReview) => void;
  onCancel?: () => void;
}

export function WriteReviewForm({ productId, onDone, onCancel }: WriteReviewFormProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [ratingError, setRatingError] = useState(false);

  const handleSubmit = async () => {
    if (!rating) {
      setRatingError(true);
      return;
    }
    try {
      const trimmed = text.trim();
      const review = await reviewStore.create(productId, {
        rating,
        ...(trimmed ? { text: trimmed } : {}),
      });
      showToast(t('review.toast_created'));
      onDone(review);
    } catch (e) {
      showToast(t(reviewErrorToastKey(e)));
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.label}>{t('review.form_rating_label')}</Text>
      <StarRatingInput value={rating} onChange={(v) => { setRating(v); setRatingError(false); }} />
      {ratingError && <Text style={styles.errorText}>{t('review.rating_required')}</Text>}

      <FormField
        placeholder={t('review.text_placeholder')}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={MAX_TEXT_LENGTH}
        style={styles.textField}
        placeholderTextColor={theme.colors.textSecondary}
      />
      <Text style={styles.counter}>{text.length}/{MAX_TEXT_LENGTH}</Text>

      <View style={styles.actions}>
        {onCancel && (
          <Pressable style={[styles.button, styles.secondary]} onPress={onCancel}>
            <Text style={styles.secondaryText}>{t('review.cancel')}</Text>
          </Pressable>
        )}
        <Pressable style={styles.button} onPress={handleSubmit} disabled={reviewStore.isSubmitting}>
          {reviewStore.isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>{t('review.submit_create')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  form: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.gap(1.5),
    gap: theme.gap(1),
  },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase' },
  errorText: { color: theme.colors.danger, fontSize: 12 },
  textField: { height: 'auto', minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: theme.colors.textSecondary },
  actions: { flexDirection: 'row', gap: theme.gap(1) },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.border },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryText: { color: theme.colors.text, fontWeight: '600', fontSize: 15 },
}));
