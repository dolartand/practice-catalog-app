import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useOrderStore, ORDER_STATUS_COLOR_KEY, type Order } from '@entities/order';
import { formatMoney } from '@shared/lib';
import { OrderCreatedBanner } from '@widgets/order-created-banner';

export function OrderDetailPage() {
  const { orderId, created } = useLocalSearchParams<{ orderId: string; created?: string }>();
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const orderStore = useOrderStore();

  const [order, setOrder] = useState<Order | null>(orderStore.getCachedById(orderId) ?? null);
  const [isLoading, setIsLoading] = useState(!order);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (order) return;
    orderStore.fetchOne(orderId).then(setOrder).finally(() => setIsLoading(false));
  }, [orderId]);

  const handleCancel = () => {
    Alert.alert(t('order.cancel_confirm_title'), t('order.cancel_confirm_message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('order.cancel_confirm_action'),
        style: 'destructive',
        onPress: async () => {
          setIsCancelling(true);
          try {
            const updated = await orderStore.cancel(orderId);
            setOrder(updated);
          } finally {
            setIsCancelling(false);
          }
        },
      },
    ]);
  };

  if (isLoading || !order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const statusColor = theme.colors[ORDER_STATUS_COLOR_KEY[order.status]];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 12, padding: theme.gap(2) }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>{order.number}</Text>
        <View style={{ width: 24 }} />
      </View>

      {created === '1' && <OrderCreatedBanner />}

      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>{t(`order.status_${order.status.toLowerCase()}`)}</Text>
      </View>

      <View style={styles.itemsList}>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
              <Text style={styles.itemSku}>{item.skuName} · ×{item.quantity}</Text>
            </View>
            <Text style={styles.itemTotal}>{formatMoney(item.totalCents, i18n.language)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.summary}>
        <SummaryRow label={t('order.items_total')} value={formatMoney(order.itemsTotalCents, i18n.language)} />
        <SummaryRow label={t('order.delivery')} value={formatMoney(order.deliveryCents, i18n.language)} />
        <SummaryRow label={t('order.total')} value={formatMoney(order.totalCents, i18n.language)} emphasized />
      </View>

      {order.status === 'NEW' && (
        <Pressable style={styles.cancelButton} onPress={handleCancel} disabled={isCancelling}>
          <Text style={styles.cancelText}>{isCancelling ? t('common.loading') : t('order.cancel_action')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function SummaryRow({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, emphasized && styles.summaryLabelEmphasized]}>{label}</Text>
      <Text style={[styles.summaryValue, emphasized && styles.summaryValueEmphasized]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.gap(2) },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: theme.gap(1.25), paddingVertical: theme.gap(0.5), marginBottom: theme.gap(2) },
  statusText: { fontSize: 13, fontWeight: '700' },
  itemsList: { gap: theme.gap(1.25), marginBottom: theme.gap(2.5) },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.gap(1), paddingBottom: theme.gap(1.25), borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  itemSku: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  summary: { gap: theme.gap(0.75), marginBottom: theme.gap(3) },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, color: theme.colors.textSecondary },
  summaryLabelEmphasized: { fontSize: 15, color: theme.colors.text, fontWeight: '700' },
  summaryValue: { fontSize: 13, color: theme.colors.text },
  summaryValueEmphasized: { fontSize: 18, color: theme.colors.primary, fontWeight: '800' },
  cancelButton: { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: theme.colors.danger, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: theme.colors.danger, fontWeight: '700' },
}));