import { Package, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { CartItem } from '@entities/cart';
import { QuantityStepper } from '@features/change-cart-quantity';
import { formatMoney } from '@shared/lib';

interface CartItemRowProps {
  item: CartItem;
  locale: string;
  isPending: boolean;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export function CartItemRow({ item, locale, isPending, onQuantityChange, onRemove }: CartItemRowProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();

  return (
    <View style={[styles.row, item.unavailable && styles.rowUnavailable]}>
      <View style={styles.imagePlaceholder}>
        <Package size={22} color={theme.colors.textSecondary} />
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{item.productName}</Text>
        <Text style={styles.skuName}>{item.skuName}</Text>

        {item.unavailable ? (
          <Text style={styles.unavailableText}>{t('cart.item_unavailable')}</Text>
        ) : (
          <Text style={styles.price}>{formatMoney(item.priceWithDiscountCents, locale)}</Text>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Trash2 size={18} color={theme.colors.textSecondary} />
        </Pressable>
        {!item.unavailable && (
          <QuantityStepper value={item.quantity} disabled={isPending} onChange={onQuantityChange} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', gap: theme.gap(1.25), padding: theme.gap(1.5), backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border },
  rowUnavailable: { opacity: 0.55 },
  imagePlaceholder: { width: 56, height: 56, borderRadius: 12, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  skuName: { fontSize: 12, color: theme.colors.textSecondary },
  price: { fontSize: 15, fontWeight: '700', color: theme.colors.primary, marginTop: 4 },
  unavailableText: { fontSize: 12, color: theme.colors.danger, marginTop: 4, fontWeight: '600' },
  actions: { alignItems: 'flex-end', justifyContent: 'space-between' },
}));