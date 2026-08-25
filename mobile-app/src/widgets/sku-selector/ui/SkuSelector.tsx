import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { resolveSkuPrice, type Product, type ProductSku } from '@entities/product';
import { formatMoney } from '@shared/lib/money';

interface SkuSelectorProps {
  product: Product;
  selectedSkuId: string | null;
  locale: string;
  onSelect: (sku: ProductSku) => void;
}

export function SkuSelector({ product, selectedSkuId, locale, onSelect }: SkuSelectorProps) {
  const { t } = useTranslation();
  
  // Показываем селектор, только если реально есть выбор — один активный SKU выбирается сам собой
  const activeSkus = product.skus.filter((sku) => sku.isActive);
  if (activeSkus.length <= 1) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('product.variant')}</Text>
      <View style={styles.options}>
        {activeSkus.map((sku) => {
          const isSelected = sku.id === selectedSkuId;
          const isOutOfStock = sku.stockQty === 0;
          const { priceWithDiscountCents } = resolveSkuPrice(product, sku);

          return (
            <Pressable
              key={sku.id}
              disabled={isOutOfStock}
              onPress={() => onSelect(sku)}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                isOutOfStock && styles.optionDisabled,
              ]}
            >
              <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>{sku.name}</Text>
              <Text style={[styles.optionPrice, isSelected && styles.optionNameSelected]}>
                {isOutOfStock ? t('product.out_of_stock') : formatMoney(priceWithDiscountCents, locale)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { gap: theme.gap(1) },
  title: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase' },
  options: { gap: theme.gap(1) },
  option: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 14,
    paddingHorizontal: theme.gap(1.5), paddingVertical: theme.gap(1.25),
    backgroundColor: theme.colors.surface,
  },
  optionSelected: { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}10` },
  optionDisabled: { opacity: 0.4 },
  optionName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  optionNameSelected: { color: theme.colors.primary },
  optionPrice: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
}));