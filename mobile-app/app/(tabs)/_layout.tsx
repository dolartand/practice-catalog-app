import { Tabs } from 'expo-router';
import { Heart, Grid2x2, ShoppingCart, User } from 'lucide-react-native';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';

import { cartStore } from '@entities/cart';
import { favoriteStore } from '@entities/favorite';

export default observer(function TabsLayout() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();

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
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="catalog/[productId]" options={{ href: null }} />
      <Tabs.Screen
        name="catalog"
        options={{ title: t('tabs.catalog'), tabBarIcon: ({ color, size }) => <Grid2x2 color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabs.favorites'),
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} />,
          tabBarBadge: favoriteStore.count > 0 ? favoriteStore.count : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.danger },
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t('tabs.cart'),
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
          tabBarBadge: cartStore.itemCount > 0 ? cartStore.itemCount : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.danger },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tabs>
  );
});
