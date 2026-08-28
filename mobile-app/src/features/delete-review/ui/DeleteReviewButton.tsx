import { Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { isReviewGone, reviewStore, useReviewStore } from '@entities/review';
import { showToast } from '@shared/lib';

interface DeleteReviewButtonProps {
  productId: string;
  onDeleted: () => void;
}

export const DeleteReviewButton = ({ productId, onDeleted }: DeleteReviewButtonProps) => {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const isDeleting = useReviewStore((s) => s.isDeleting(productId));

  const confirmAndDelete = () => {
    Alert.alert(t('review.delete_confirm_title'), t('review.delete_confirm_message'), [
      { text: t('review.cancel'), style: 'cancel' },
      {
        text: t('review.delete_action'),
        style: 'destructive',
        onPress: async () => {
          try {
            await reviewStore.remove(productId);
            showToast(t('review.toast_deleted'));
            onDeleted();
          } catch (e) {
            if (isReviewGone(e)) {
              // Отзыв уже удалён на сервере — просто забываем локальную запись
              reviewStore.forget(productId);
              showToast(t('review.toast_deleted'));
              onDeleted();
              return;
            }
            showToast(t('errors.unknown.title'));
          }
        },
      },
    ]);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }, isDeleting && styles.deleting]}
      onPress={confirmAndDelete}
      disabled={isDeleting}
      accessibilityRole="button"
    >
      <Trash2 size={16} color={theme.colors.danger} />
      <Text style={[styles.text, { color: theme.colors.danger }]}>{t('review.delete_action')}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create((theme) => ({
  button: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${theme.colors.danger}55`,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.gap(1),
    backgroundColor: 'transparent',
  },
  deleting: { opacity: 0.5 },
  text: { fontWeight: '600', fontSize: 15 },
}));
