import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

// Статический контент без API — значения живут в локалях
export function AboutPage() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const contacts: [string, string][] = [
    [t('about.address_label'), t('about.address_value')],
    [t('about.phone_label'), t('about.phone_value')],
    [t('about.email_label'), t('about.email_value')],
    [t('about.hours_label'), t('about.hours_value')],
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>{t('about.title')}</Text>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <X size={22} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.gap(3) }]}
      >
        <Text style={styles.body}>{t('about.body')}</Text>

        <View style={styles.contactsCard}>
          {contacts.map(([label, value]) => (
            <View key={label} style={styles.contactRow}>
              <Text style={styles.contactLabel}>{label}</Text>
              <Text style={styles.contactValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.version}>{t('about.version', { version })}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.gap(1.5),
    paddingBottom: theme.gap(1),
  },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  content: { padding: theme.gap(1.5), gap: theme.gap(1.5) },
  body: { fontSize: 14, lineHeight: 22, color: theme.colors.text },
  contactsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.gap(1.5),
    gap: theme.gap(1),
  },
  contactRow: { gap: 2 },
  contactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  contactValue: { fontSize: 15, color: theme.colors.text },
  version: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center' },
}));
