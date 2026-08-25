// Единственное место со строками навигации expo-router.
// Экранные имена в _layout (Tabs.Screen/Stack.Screen name=...) — это имена файлов,
// их не меняем; здесь — только пути для router.push/replace/Redirect.

export const ROUTES = {
  auth: {
    login: '/(auth)/login',
    register: '/(auth)/register',
  },

  tabs: {
    catalog: '/(tabs)/catalog',
    favorites: '/(tabs)/favorites',
    cart: '/(tabs)/cart',
    profile: '/(tabs)/profile',
  },

  product: (productId: string) => `/catalog/${productId}`,

  checkout: '/checkout',

  profile: {
    edit: '/profile/edit',
    settings: '/profile/settings',
    about: '/profile/about',
    changePassword: '/profile/change-password',
    orders: '/profile/orders',
    order: (orderId: string) => `/profile/orders/${orderId}`,
  },
} as const;
