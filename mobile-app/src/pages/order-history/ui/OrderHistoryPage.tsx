import { useRouter } from 'expo-router';
import { ChevronLeft, Package } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useOrderStore, ORDER_STATUS_COLOR_KEY, type Order } from '@stores/orderStore';
import { formatMoney , ROUTES } from '@shared/lib';

type HistoryRow = { kind: 'header'; key: string; label: string } | { kind: 'order'; key: string; order: Order };

const Separator = () => <View style={{ height: 12 }} />;

export const OrderHistoryPage = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useOrderStore((s) => s.items);
  const isLoading = useOrderStore((s) => s.isLoading);
  const error = useOrderStore((s) => s.error);

  useEffect(() => {
    useOrderStore.getState().fetchList();
  }, []);

  // Текущие — все не доставленные; прошлые — DELIVERED. Разделение чисто визуальное,
  // на сервере (пока) нет параметра фильтрации по статусу.
  const currentOrders = items.filter((order) => order.status !== 'DELIVERED');
  const pastOrders = items.filter((order) => order.status === 'DELIVERED');
  const rows: HistoryRow[] = [
    ...(currentOrders.length > 0
      ? [{ kind: 'header' as const, key: 'header-current', label: t('order.current_section') },
        ...currentOrders.map((order): HistoryRow => ({ kind: 'order' as const, key: order.id, order }))]
      : []),
    ...(pastOrders.length > 0
      ? [{ kind: 'header' as const, key: 'header-past', label: t('order.past_section') },
        ...pastOrders.map((order): HistoryRow => ({ kind: 'order' as const, key: order.id, order }))]
      : []),
  ];

  if (isLoading && items.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Package size={40} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>{t('order.history_empty')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.key}
      contentContainerStyle={{ padding: theme.gap(1.5), paddingTop: insets.top + 12 }}
      onEndReached={() => useOrderStore.getState().fetchMore()}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={() => (
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={24} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.title}>{t('order.history_title')}</Text>
          <View style={{ width: 24 }} />
        </View>
      )}
      ItemSeparatorComponent={Separator}
      renderItem={({ item }) =>
        item.kind === 'header' ? (
          <Text style={styles.sectionTitle}>{item.label}</Text>
        ) : (
          <OrderRow
            order={item.order}
            locale={i18n.language}
            onPress={() => router.push(ROUTES.profile.order(item.order.id))}
          />
        )
      }
    />
  );
};

function OrderRow({ order, locale, onPress }: { order: Order; locale: string; onPress: () => void }) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const statusColor = theme.colors[ORDER_STATUS_COLOR_KEY[order.status]];

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowTop}>
        <Text style={styles.rowNumber}>{order.number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{t(`order.status_${order.status.toLowerCase()}`)}</Text>
        </View>
      </View>
      <Text style={styles.rowTotal}>{formatMoney(order.totalCents, locale)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.gap(1.5), backgroundColor: theme.colors.background },
  emptyText: { color: theme.colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.gap(2) },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase', marginTop: theme.gap(1), marginBottom: -theme.gap(0.5) },
  row: { backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: theme.gap(1.5), gap: theme.gap(0.75) },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowNumber: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  statusBadge: { borderRadius: 8, paddingHorizontal: theme.gap(1), paddingVertical: theme.gap(0.35) },
  statusText: { fontSize: 11, fontWeight: '700' },
  rowTotal: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
}));

