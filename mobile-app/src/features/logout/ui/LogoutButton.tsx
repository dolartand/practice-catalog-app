import { LogOut } from 'lucide-react-native';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { sessionStore } from '@entities/session';

export const LogoutButton = observer(() => {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirmAndLogout = () => {
    Alert.alert(t('auth.logout_confirm_title'), t('auth.logout_confirm_message'), [
      { text: t('review.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: async () => {
          setIsSubmitting(true);
          try {
            // forceLogout в finally сбросит сессию даже при сетевой ошибке;
            // локальные данные (корзина/избранное/мои отзывы) чистят bootstrap-reaction
            await sessionStore.logout();
          } catch {
            // сессия уже очищена — молча выходим
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }, isSubmitting && styles.deleting]}
      onPress={confirmAndLogout}
      disabled={isSubmitting}
      accessibilityRole="button"
    >
      {isSubmitting ? (
        <ActivityIndicator color={theme.colors.danger} />
      ) : (
        <>
          <LogOut size={19} color={theme.colors.danger} />
          <Text style={[styles.text, { color: theme.colors.danger }]}>{t('auth.logout')}</Text>
        </>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create((theme) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.gap(1.25),
    paddingVertical: theme.gap(1.25),
  },
  deleting: { opacity: 0.5 },
  text: { fontSize: 15, fontWeight: '600' },
}));
