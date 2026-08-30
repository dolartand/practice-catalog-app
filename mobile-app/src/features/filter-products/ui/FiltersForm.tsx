import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View, TextInput } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { FiltersDraft } from '../model/filters-draft';

import { PRODUCT_TYPES, type ProductSort, PRODUCT_TYPE_LABEL_KEYS } from '@entities/product';
import { SegmentedToggle } from '@shared/ui';


const SORT_OPTIONS: ProductSort[] = ['newest', 'price_asc', 'price_desc', 'rating_desc', 'discount_desc'];

interface FiltersFormProps {
  draft: FiltersDraft;
  onChange: (patch: Partial<FiltersDraft>) => void;
}

export function FiltersForm({ draft, onChange }: FiltersFormProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Section title={t('filters.price')}>
        <View style={styles.priceRow}>
          <TextField
            value={draft.priceFrom}
            onChangeText={(v) => onChange({ priceFrom: v })}
            placeholder={t('filters.price_from')}
          />
          <Text style={styles.priceDash}>—</Text>
          <TextField
            value={draft.priceTo}
            onChangeText={(v) => onChange({ priceTo: v })}
            placeholder={t('filters.price_to')}
          />
        </View>
      </Section>

      <Section title={t('filters.series')}>
        <TextField value={draft.series} onChangeText={(v) => onChange({ series: v })} placeholder={t('filters.series_placeholder')} />
      </Section>

      <Section title={t('filters.type')}>
        <View style={styles.chipsWrap}>
          <Chip
            label={t('filters.type_any')}
            isActive={draft.type === null}
            onPress={() => onChange({ type: null })}
          />
          {PRODUCT_TYPES.map((type) => (
            <Chip key={type} label={t(PRODUCT_TYPE_LABEL_KEYS[type])} isActive={draft.type === type} onPress={() => onChange({ type })} />
          ))}
        </View>
      </Section>

      <Section title={t('filters.sort')}>
        <View style={styles.chipsWrap}>
          {SORT_OPTIONS.map((sort) => (
            <Chip
              key={sort}
              label={t(`filters.sort_${sort}`)}
              isActive={draft.sort === sort}
              onPress={() => onChange({ sort })}
            />
          ))}
        </View>
      </Section>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>{t('filters.in_stock_only')}</Text>
        <SegmentedToggle value={draft.inStock} onChange={(v) => onChange({ inStock: v })} />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>{t('filters.discounted_only')}</Text>
        <SegmentedToggle value={draft.onlyDiscounted} onChange={(v) => onChange({ onlyDiscounted: v })} />
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function TextField({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  const { theme } = useUnistyles();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textSecondary}
      keyboardType="decimal-pad"
      style={{
        flex: 1,
        height: 46,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.gap(1.25),
        color: theme.colors.text,
        fontSize: 14,
      }}
    />
  );
}
// keyboardType="decimal-pad" жёстко зашит только для price-полей — 
// но у series он не нужен (это текст), так что параметризую TextField пропом 
// keyboardType?: KeyboardTypeOptions с дефолтом 'default',
// и для цены передаю явно keyboardType="decimal-pad" при вызове.

function Chip({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, isActive && styles.chipActive]}>
      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: { padding: theme.gap(2), gap: theme.gap(2.5) },
  section: { gap: theme.gap(1) },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: theme.gap(1) },
  priceDash: { color: theme.colors.textSecondary },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.gap(1) },
  chip: {
    paddingHorizontal: theme.gap(1.5),
    paddingVertical: theme.gap(0.75),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, color: theme.colors.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontSize: 15, color: theme.colors.text },
  textFieldWrapper: { flex: 1 },
}));