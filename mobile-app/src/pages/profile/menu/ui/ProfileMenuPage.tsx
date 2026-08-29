import { useRouter } from 'expo-router';
import { ChevronRight, Info, Package, Settings, LogIn } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useSessionStore } from '@stores/sessionStore';
import { LogoutButton } from '@features/logout';
import { ROUTES } from '@shared/lib';
import { NavLinkRow } from '@shared/ui';


function initials(firstName: string, lastName: string): string {
  const result = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return result || '?';
}

function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export const ProfileMenuPage = () => {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useSessionStore((s) => s.user);
  const fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);

    const goToAccount = () =>
        router.push(isAuthenticated ? ROUTES.profile.edit : ROUTES.auth.login);
    const goToOrders = () =>
        router.push(isAuthenticated ? ROUTES.profile.orders : ROUTES.auth.login);

    return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>{t('tabs.profile')}</Text>

      <Pressable style={styles.userCard} onPress={goToAccount}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user ? initials(user.firstName, user.lastName) : '?'}
          </Text>
        </View>
        <View style={styles.userMeta}>
          <Text style={styles.userName}>{fullName || t('profile.guest_title')}</Text>
          <Text style={styles.userEmail}>{user?.email ?? t('profile.guest_hint')}</Text>
        </View>
        <ChevronRight size={18} color={theme.colors.textSecondary} />
      </Pressable>

      <Card>
        <NavLinkRow
          icon={Package}
          label={t('order.history_link')}
          onPress={goToOrders}
        />
        <NavLinkRow
          icon={Settings}
          label={t('profile.settings_link')}
          onPress={() => router.push(ROUTES.profile.settings)}
        />
      </Card>

      <Card>
        <NavLinkRow
          icon={Info}
          label={t('profile.about_link')}
          onPress={() => router.push(ROUTES.profile.about)}
        />
      </Card>

      <Card>
          {isAuthenticated ? (
              <LogoutButton />
          ) : (
              <NavLinkRow
                  icon={LogIn}
                  label={t('auth.login_submit')}
                  onPress={() => router.push(ROUTES.auth.login)}
              />
          )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.gap(1.5),
    gap: theme.gap(1.5),
  },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.gap(1.5),
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.gap(1.5),
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  userMeta: { flex: 1, gap: 2 },
  userName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  userEmail: { fontSize: 13, color: theme.colors.textSecondary },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.gap(1.5),
  },
}));
