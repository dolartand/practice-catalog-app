import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { sessionStore } from '@entities/session';
import { parseApiError } from '@shared/api';
import { ROUTES, useErrorMessage } from '@shared/lib';
import { FormField } from '@shared/ui';

export function LoginForm() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ReturnType<typeof parseApiError> | null>(null);
  const errorMessage = useErrorMessage(error);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await sessionStore.login({ email, password });
      router.replace(ROUTES.tabs.catalog);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setIsSubmitting(false);
    }
  };
  const fieldErrors = error?.kind === 'api' ? error.fieldErrors : {};

  return (
    <View style={styles.form}>
      <FormField
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.email_placeholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        errorText={fieldErrors.email?.[0]}
      />
      <FormField
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.password_placeholder')}
        secureTextEntry
        errorText={fieldErrors.password?.[0]}
      />

      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{errorMessage.title}</Text>
          <Text style={styles.errorDetail}>{errorMessage.detail}</Text>
        </View>
      )}

      <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
        <Text style={styles.submitText}>{isSubmitting ? t('common.loading') : t('auth.login_submit')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  form: { gap: theme.gap(1.5) },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.gap(1.5),
    fontSize: 15,
  },
  errorBox: { backgroundColor: `${theme.colors.danger}15`, borderRadius: 12, padding: theme.gap(1.5) },
  errorTitle: { color: theme.colors.danger, fontWeight: '700', marginBottom: 2 },
  errorDetail: { color: theme.colors.danger, fontSize: 13 },
  submitButton: { height: 50, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
}));