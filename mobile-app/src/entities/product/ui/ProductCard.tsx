import { Star } from 'lucide-react-native';
import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { ProductListItem } from '../model/types';

import { formatMoney } from '@shared/lib';

interface ProductCardProps {
  product: ProductListItem;
  locale: string;
  onPress: (id: string) => void;
  /** Слот поверх изображения (правый нижний угол) — например, кнопка избранного */
  action?: ReactNode;
}

export const ProductCard = memo(({ product, locale, onPress, action }: ProductCardProps) => {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const hasDiscount = product.discountPercent != null && product.discountPercent > 0;

  return (
    <Pressable style={styles.card} onPress={() => onPress(product.id)}>
      <Image source={{ uri: product.mainImageUrl ?? undefined }} style={styles.image} />

      {hasDiscount && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>−{product.discountPercent}%</Text>
        </View>
      )}
      {!product.inStock && (
        <View style={styles.outOfStockBadge}>
          <Text style={styles.outOfStockText}>{t('catalog.out_of_stock')}</Text>
        </View>
      )}
      {action && <View style={styles.actionSlot}>{action}</View>}

      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>

      {product.ratingCount > 0 && (
        <View style={styles.ratingRow}>
          <Star size={12} color={theme.colors.star} fill={theme.colors.star} />
          <Text style={styles.ratingText}>
            {product.ratingAverage.toFixed(1)} ({product.ratingCount})
          </Text>
        </View>
      )}

      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatMoney(product.priceWithDiscountCents, locale)}</Text>
        {hasDiscount && <Text style={styles.oldPrice}>{formatMoney(product.priceCents, locale)}</Text>}
      </View>
    </Pressable>
  );
});

ProductCard.displayName = 'ProductCard';

const styles = StyleSheet.create((theme) => ({
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.gap(1.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  image: { width: '100%', aspectRatio: 1, borderRadius: 12, marginBottom: theme.gap(1), backgroundColor: theme.colors.background },
  discountBadge: {
    position: 'absolute',
    top: theme.gap(1),
    right: theme.gap(1),
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.gap(1),
    paddingVertical: theme.gap(0.5),
    borderRadius: 8,
  },
  discountText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  outOfStockBadge: {
    position: 'absolute',
    top: theme.gap(1),
    left: theme.gap(1),
    backgroundColor: theme.colors.danger,
    paddingHorizontal: theme.gap(1),
    paddingVertical: theme.gap(0.5),
    borderRadius: 8,
  },
  outOfStockText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  actionSlot: { position: 'absolute', bottom: theme.gap(1), right: theme.gap(1) },
  name: { color: theme.colors.text, fontSize: 14, fontWeight: '500', marginBottom: theme.gap(0.5) },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: theme.gap(0.5) },
  ratingText: { fontSize: 12, color: theme.colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: theme.gap(0.75) },
  price: { color: theme.colors.primary, fontSize: 16, fontWeight: '700' },
  oldPrice: { color: theme.colors.textSecondary, fontSize: 13, textDecorationLine: 'line-through' },
}));