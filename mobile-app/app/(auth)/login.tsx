import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View , Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { LoginForm } from '@features/login/ui/LoginForm';
import { ROUTES } from '@shared/lib';

export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <Text style={styles.title}>{t('auth.login_title')}</Text>
      <LoginForm />
      <Link href={ROUTES.auth.register} style={styles.link}>
        {t('auth.go_to_register')}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.gap(2.5) },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text, marginBottom: theme.gap(3) },
  link: { marginTop: theme.gap(2), color: theme.colors.primary, textAlign: 'center' },
}));