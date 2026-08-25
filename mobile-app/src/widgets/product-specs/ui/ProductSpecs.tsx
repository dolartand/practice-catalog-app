import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { Product } from '@entities/product';

export function ProductSpecs({ product }: { product: Product }) {
  const { t } = useTranslation();

  const rows: [string, string | null][] = [
    [t('product.spec_series'), product.series],
    [t('product.spec_type'), product.productType],
    [t('product.spec_decor'), product.decor],
    [t('product.spec_material'), product.material],
    [t('product.spec_capacity'), product.capacityMl ? `${product.capacityMl} ${t('product.unit_ml')}` : null],
    [t('product.spec_weight'), product.weightG ? `${product.weightG} ${t('product.unit_g')}` : null],
    [t('product.spec_dimensions'), product.dimensions],
    [t('product.spec_country'), product.countryOfOrigin],
    [t('product.spec_article'), product.article],
  ];

  const visibleRows = rows.filter(([, value]) => value != null && value !== '');
  if (visibleRows.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('product.specs_title')}</Text>
      {visibleRows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { gap: theme.gap(1) },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: theme.gap(0.5) },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.gap(0.75), borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  label: { fontSize: 13, color: theme.colors.textSecondary, flex: 1 },
  value: { fontSize: 13, color: theme.colors.text, flex: 1, textAlign: 'right', fontWeight: '500' },
}));