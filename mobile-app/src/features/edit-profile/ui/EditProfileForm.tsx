import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useSessionStore } from '@stores/sessionStore';
import { parseApiError, type AppError } from '@shared/api';
import { showToast } from '@shared/lib';
import { FormField } from '@shared/ui';

const MAX_NAME_LENGTH = 100;
const MAX_PHONE_LENGTH = 30;

export function EditProfileForm() {
  const { t } = useTranslation();
  const router = useRouter();

  const user = useSessionStore.getState().user;
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const fieldErrors = error?.kind === 'api' ? error.fieldErrors : {};

  const errorTextFor = (field: string): string | undefined =>
    fieldErrors[field]?.[0] ?? localErrors[field];

  // Клиентская валидация зеркалит бэкенд: имена 1..100 непустые, телефон ≤30
  const handleSubmit = async () => {
    setError(null);

    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = t('profile.error_required');
    else if (firstName.trim().length > MAX_NAME_LENGTH) errors.firstName = t('profile.error_name_length');
    if (!lastName.trim()) errors.lastName = t('profile.error_required');
    else if (lastName.trim().length > MAX_NAME_LENGTH) errors.lastName = t('profile.error_name_length');
    if (phone.trim().length > MAX_PHONE_LENGTH) errors.phone = t('profile.error_phone_length');

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      return;
    }
    setLocalErrors({});

    setIsSubmitting(true);
    try {
      await useSessionStore.getState().updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
      });
      showToast(t('profile.saved'));
      router.back();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <View style={styles.form}>
      <Text style={styles.label}>{t('profile.field_email')}</Text>
      <Text style={styles.readOnlyValue}>{user.email}</Text>
      <Text style={styles.hint}>{t('profile.email_readonly')}</Text>

      <FormField
        value={firstName}
        onChangeText={setFirstName}
        placeholder={t('auth.first_name_placeholder')}
        errorText={errorTextFor('firstName')}
        maxLength={MAX_NAME_LENGTH}
      />
      <FormField
        value={lastName}
        onChangeText={setLastName}
        placeholder={t('auth.last_name_placeholder')}
        errorText={errorTextFor('lastName')}
        maxLength={MAX_NAME_LENGTH}
      />
      <FormField
        value={phone}
        onChangeText={setPhone}
        placeholder={t('profile.phone_optional')}
        keyboardType="phone-pad"
        errorText={errorTextFor('phone')}
        maxLength={MAX_PHONE_LENGTH}
      />

      <Pressable style={styles.submit} onPress={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{t('profile.save')}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  form: { gap: theme.gap(1.5) },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase' },
  readOnlyValue: { fontSize: 15, color: theme.colors.text, marginTop: -theme.gap(0.5) },
  hint: { fontSize: 12, color: theme.colors.textSecondary, marginTop: -theme.gap(1.25) },
  submit: {
    height: 50,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.gap(1),
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
}));
