import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { useUnistyles } from 'react-native-unistyles';
import { Heart, Grid2x2, ShoppingCart, User } from 'lucide-react-native';

import { useCartStore } from '@stores/cartStore';
import { useFavoriteStore } from '@stores/favoriteStore';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const cartCount = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0));
  const favoriteCount = useFavoriteStore((s) => s.favoriteIds.size);

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
        options={{ title: t('tabs.catalog'), tabBarIcon: ({ color, size }) => <Grid2x2 color={color} size={size} />, }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabs.favorites'),
          tabBarIcon:  ({ color, size }) => <Heart color={color} size={size} />,
          tabBarBadge: favoriteCount > 0 ? favoriteCount : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.danger },
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t('tabs.cart'),
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.danger },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'),
            tabBarIcon:({ color, size }) => <User color={color} size={size} />, }}
      />
    </Tabs>
  );
}
