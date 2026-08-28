import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { getLastContact, saveLastContact } from '../lib/last-contact-storage';

import { useCartStore } from '@stores/cartStore';
import { useOrderStore, type Order } from '@stores/orderStore';
import { parseApiError, type AppError, type StockIssue } from '@shared/api/problem-details';
import { useErrorMessage } from '@shared/lib/error-message';
import { FormField } from '@shared/ui/form-field/FormField';


function resolveIssueName(skuId: string): string | null {
  const cartItem = useCartStore.getState().items.find((item) => item.skuId === skuId);
  if (!cartItem) return null;
  return [cartItem.productName, cartItem.skuName].filter(Boolean).join(' · ');
}

function StockIssues({ issues }: { issues: StockIssue[] }) {
  const { t } = useTranslation();

  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorTitle}>{t('checkout.stock_issue_title')}</Text>
      {issues.map((issue) => {
        const name = resolveIssueName(issue.skuId) ?? issue.skuId;
        return (
          <Text key={issue.skuId} style={styles.errorDetail}>
            {t('checkout.stock_issue_line', { name, requested: issue.requested, available: issue.available })}
          </Text>
        );
      })}
    </View>
  );
}

export function CheckoutForm({ onCreated }: { onCreated: (order: Order) => void }) {
  const { t } = useTranslation();
  const orderStore = useOrderStore();

  const lastContact = getLastContact();
  const [customerName, setCustomerName] = useState(lastContact?.customerName ?? '');
  const [customerPhone, setCustomerPhone] = useState(lastContact?.customerPhone ?? '');
  const [deliveryCity, setDeliveryCity] = useState(lastContact?.deliveryCity ?? '');
  const [deliveryAddress, setDeliveryAddress] = useState(lastContact?.deliveryAddress ?? '');
  const [comment, setComment] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const errorMessage = useErrorMessage(error);
  const fieldErrors = error?.kind === 'api' ? error.fieldErrors : {};

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const order = await orderStore.create({
        customerName,
        customerPhone,
        deliveryCity,
        deliveryAddress,
        comment: comment.trim() || undefined,
      });

      saveLastContact({ customerName, customerPhone, deliveryCity, deliveryAddress });
      useCartStore.getState().reset(); // сервер уже очистил корзину при оформлении — синхронизируем локально без лишнего похода на /cart

      onCreated(order);
    } catch (e) {
      const parsed = parseApiError(e);
      setError(parsed);
      // Бэкенд при 422 помечает проблемные позиции в корзине — подтягиваем актуальные флаги unavailable
      if (parsed.kind === 'api' && parsed.stockIssues) {
        void useCartStore.getState().fetch();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      <FormField
        value={customerName}
        onChangeText={setCustomerName}
        placeholder={t('checkout.name_placeholder')}
        errorText={fieldErrors.customerName?.[0]}
      />
      <FormField
        value={customerPhone}
        onChangeText={setCustomerPhone}
        placeholder={t('checkout.phone_placeholder')}
        keyboardType="phone-pad"
        errorText={fieldErrors.customerPhone?.[0]}
      />
      <FormField
        value={deliveryCity}
        onChangeText={setDeliveryCity}
        placeholder={t('checkout.city_placeholder')}
        errorText={fieldErrors.deliveryCity?.[0]}
      />
      <FormField
        value={deliveryAddress}
        onChangeText={setDeliveryAddress}
        placeholder={t('checkout.address_placeholder')}
        errorText={fieldErrors.deliveryAddress?.[0]}
      />
      <FormField
        value={comment}
        onChangeText={setComment}
        placeholder={t('checkout.comment_placeholder')}
        multiline
        numberOfLines={3}
        errorText={fieldErrors.comment?.[0]}
      />

      {error?.kind === 'api' && error.stockIssues ? (
        <StockIssues issues={error.stockIssues} />
      ) : (
        errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>{errorMessage.title}</Text>
            <Text style={styles.errorDetail}>{errorMessage.detail}</Text>
          </View>
        )
      )}

      <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
        <Text style={styles.submitText}>{isSubmitting ? t('common.loading') : t('checkout.submit')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  form: { gap: theme.gap(1.5) },
  errorBox: { backgroundColor: `${theme.colors.danger}15`, borderRadius: 12, padding: theme.gap(1.5) },
  errorTitle: { color: theme.colors.danger, fontWeight: '700', marginBottom: 2 },
  errorDetail: { color: theme.colors.danger, fontSize: 13 },
  submitButton: { height: 54, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
}));