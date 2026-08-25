import { useRouter } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { LanguageSwitcher } from '@features/change-language';
import { ThemeSwitcher } from '@features/change-theme';
import { ROUTES } from '@shared/lib';
import { NavLinkRow } from '@shared/ui';

// Блок 11: Tamagui-эксперимент свёрнут — страница в общем стиле приложения (unistyles)
export function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>{t('settings.title')}</Text>

        <Card>
          <Text style={styles.sectionLabel}>{t('settings.theme')}</Text>
          <ThemeSwitcher />
        </Card>

        <Card>
          <LanguageSwitcher />
        </Card>

        <Card>
          <NavLinkRow
            icon={KeyRound}
            label={t('auth.change_password_link')}
            onPress={() => router.push(ROUTES.profile.changePassword)}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.gap(1.5), gap: theme.gap(1.5) },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.text, marginBottom: theme.gap(0.5) },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: theme.gap(1),
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.gap(1.5),
  },
}));
