import { useRouter } from 'expo-router';
import { ShoppingCart } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useCartStore } from '@stores/cartStore';
import type { CartItem } from '@entities/cart/model/types';
import { formatMoney, showErrorToast , ROUTES } from '@shared/lib';
import { CartItemRow } from '@widgets/cart-item';


export const CartPage = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const isLoading = useCartStore((s) => s.isLoading);
  const totalCents = useCartStore((s) => s.totalCents);
  const hasUnavailableItems = useCartStore((s) => s.hasUnavailableItems);
  const pendingItemIds = useCartStore((s) => s.pendingItemIds);

  useEffect(() => {
    useCartStore.getState().fetch();
  }, []);

  const handleQuantityChange = useCallback((item: CartItem, quantity: number) => {
    if (quantity <= 0) {
      useCartStore.getState().removeItem(item.id).catch(showErrorToast);
    } else {
      useCartStore.getState().updateQuantity(item.id, quantity).catch(showErrorToast);
    }
  }, []);

  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ShoppingCart size={40} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>{t('cart.empty')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 12 }]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => useCartStore.getState().fetch()} />}
        ListHeaderComponent={<Text style={styles.title}>{t('cart.title')}</Text>}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <CartItemRow
            item={item}
            locale={i18n.language}
            isPending={pendingItemIds.has(item.id)}
            onQuantityChange={(q) => handleQuantityChange(item, q)}
            onRemove={() => useCartStore.getState().removeItem(item.id).catch(showErrorToast)}
          />
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {hasUnavailableItems && (
          <Text style={styles.unavailableWarning}>{t('cart.unavailable_warning')}</Text>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('cart.total')}</Text>
          <Text style={styles.totalValue}>{formatMoney(totalCents, i18n.language)}</Text>
        </View>
        <Pressable
          style={[styles.checkoutButton, hasUnavailableItems && styles.checkoutButtonDisabled]}
          disabled={hasUnavailableItems}
          onPress={() => router.push(ROUTES.checkout)}
        >
          <Text style={styles.checkoutText}>{t('cart.checkout')}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  list: { paddingHorizontal: theme.gap(1.5), paddingBottom: 160 },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text, marginBottom: theme.gap(2) },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.gap(1.5), backgroundColor: theme.colors.background },
  emptyText: { color: theme.colors.textSecondary, fontSize: 15 },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    padding: theme.gap(2), gap: theme.gap(1),
  },
  unavailableWarning: { color: theme.colors.danger, fontSize: 12, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: theme.colors.textSecondary },
  totalValue: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  checkoutButton: { height: 52, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  checkoutButtonDisabled: { opacity: 0.4 },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
}));