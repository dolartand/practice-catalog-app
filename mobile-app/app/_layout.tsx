import '@app/styles/unistyles';
import '@app/bootstrap/cart-session-sync';
import '@app/bootstrap/favorites-session-sync';
import '@app/bootstrap/reviews-session-sync';

import { Stack } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CategoryStoreProvider } from '@entities/category';
import { OrderStoreProvider } from '@entities/order';
import { ProductStoresProvider } from '@entities/product';
import { sessionStore } from '@entities/session';
import { ToastHost } from '@shared/ui';

const RootNavigation = observer(() => {
  if (sessionStore.status === 'restoring') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="+not-found" />
      <Stack.Screen name="checkout" options={{ presentation: 'modal' }} />
    </Stack>
  );
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ProductStoresProvider>
          <CategoryStoreProvider>
            <OrderStoreProvider>
              <RootNavigation />
              <ToastHost />
            </OrderStoreProvider>
          </CategoryStoreProvider>
        </ProductStoresProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}