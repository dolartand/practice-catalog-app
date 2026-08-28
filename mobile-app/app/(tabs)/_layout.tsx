import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { memo } from 'react';
import { useUnistyles } from 'react-native-unistyles';

import { useCartStore } from '@stores/cartStore';
import { useFavoriteStore } from '@stores/favoriteStore';

const TabIcon = memo(() => <Text>•</Text>);
TabIcon.displayName = 'TabIcon';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const cartCount = useCartStore((s) => s.itemCount);
  const favoriteCount = useFavoriteStore((s) => s.count);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="catalog"
        options={{ title: t('tabs.catalog'), tabBarIcon: TabIcon }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabs.favorites'),
          tabBarIcon: TabIcon,
          tabBarBadge: favoriteCount > 0 ? favoriteCount : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.danger },
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t('tabs.cart'),
          tabBarIcon: TabIcon,
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.danger },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: TabIcon }}
      />
    </Tabs>
  );
}
