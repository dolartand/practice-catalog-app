import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { ChangePasswordForm } from '@features/change-password';
import { ROUTES } from '@shared/lib';
import { GlassCard } from '@shared/ui';


export function ChangePasswordPage() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('auth.change_password_title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <GlassCard style={styles.card}>
        <ChangePasswordForm onFinished={() => router.replace(ROUTES.auth.login)} />
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.gap(2) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.gap(3) },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  card: { minHeight: 320 },
}));