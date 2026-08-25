import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { Order } from '@entities/order';
import { CheckoutForm } from '@features/checkout/ui/CheckoutForm';
import { ROUTES } from '@shared/lib';

export function CheckoutPage() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleCreated = (order: Order) => {
    router.replace(`${ROUTES.profile.order(order.id)}?created=1`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 12, padding: theme.gap(2) }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('checkout.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <CheckoutForm onCreated={handleCreated} />
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.gap(3) },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
}));