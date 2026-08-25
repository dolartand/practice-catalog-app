import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ChangePasswordSuccess } from './ChangePasswordSuccess';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

import { sessionStore } from '@entities/session';
import { parseApiError, type AppError } from '@shared/api';
import { useErrorMessage } from '@shared/lib';
import { PasswordField } from '@shared/ui';


export function ChangePasswordForm({ onFinished }: { onFinished: () => void }) {
  const { t } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [localMismatch, setLocalMismatch] = useState(false);

  const errorMessage = useErrorMessage(error);
  const fieldErrors = error?.kind === 'api' ? error.fieldErrors : {};

  const handleSubmit = async () => {
    if (newPassword !== newPasswordConfirm) {
      setLocalMismatch(true);
      return;
    }
    setLocalMismatch(false);
    setError(null);
    setIsSubmitting(true);

    try {
      await sessionStore.changePassword({ currentPassword, newPassword, newPasswordConfirm });
      setIsSuccess(true);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return <ChangePasswordSuccess onDone={onFinished} />;
  }

  return (
    <View style={styles.form}>
      <PasswordField
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder={t('auth.current_password_placeholder')}
        errorText={fieldErrors.currentPassword?.[0]}
      />

      <View style={styles.newPasswordGroup}>
        <PasswordField
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={t('auth.new_password_placeholder')}
          errorText={fieldErrors.newPassword?.[0]}
        />
        <PasswordStrengthMeter password={newPassword} />
      </View>

      <PasswordField
        value={newPasswordConfirm}
        onChangeText={setNewPasswordConfirm}
        placeholder={t('auth.new_password_confirm_placeholder')}
        errorText={localMismatch ? t('auth.passwords_do_not_match') : fieldErrors.newPasswordConfirm?.[0]}
      />

      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>{errorMessage.title}</Text>
          <Text style={styles.errorDetail}>{errorMessage.detail}</Text>
        </View>
      )}

      <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
        <Text style={styles.submitText}>{isSubmitting ? t('common.loading') : t('auth.change_password_submit')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  form: { gap: theme.gap(1.5) },
  newPasswordGroup: { gap: theme.gap(0.75) },
  errorBox: { backgroundColor: `${theme.colors.danger}15`, borderRadius: 12, padding: theme.gap(1.5) },
  errorTitle: { color: theme.colors.danger, fontWeight: '700', marginBottom: 2 },
  errorDetail: { color: theme.colors.danger, fontSize: 13 },
  submitButton: { height: 50, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
}));