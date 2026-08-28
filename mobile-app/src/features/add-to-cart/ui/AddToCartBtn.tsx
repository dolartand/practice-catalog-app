import { ShoppingCart } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useCartStore } from '@stores/cartStore';
import { showErrorToast } from '@shared/lib';

interface AddToCartButtonProps {
  skuId: string | null;
  disabled?: boolean;
}

export function AddToCartButton({ skuId, disabled }: AddToCartButtonProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePress = async () => {
    if (!skuId) return;
    setIsSubmitting(true);
    try {
      await useCartStore.getState().addItem(skuId, 1);
    } catch (e) {
      // Блок 11: ошибки больше не молчат — централизованный понятный тост
      showErrorToast(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = disabled || !skuId || isSubmitting;

  return (
    <Pressable style={[styles.button, isDisabled && styles.buttonDisabled]} onPress={handlePress} disabled={isDisabled}>
      {isSubmitting ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <ShoppingCart size={18} color="#fff" />
          <Text style={styles.text}>{t('product.add_to_cart')}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    height: 54, borderRadius: 16, backgroundColor: theme.colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.gap(1),
  },
  buttonDisabled: { opacity: 0.4 },
  text: { color: '#fff', fontSize: 16, fontWeight: '700' },
}));