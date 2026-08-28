import React from 'react';
import { Text } from 'react-native';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSessionStore, useSessionRestore } from '@stores/sessionStore';
import { useCartSessionSync } from '@stores/cartSessionSync';
import { useFavoritesSessionSync } from '@stores/favoritesSessionSync';
import { useReviewsSessionSync } from '@stores/reviewsSessionSync';
import { ToastHost } from '@shared/ui';

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  if (hasError) {
    console.error('ErrorBoundary caught:', error);
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ color: 'red', textAlign: 'center' }}>
          Error: {error?.message}
          <Text style={{ marginTop: 10 }}>Check Metro logs for stack trace</Text>
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

function RootNavigation() {
  const status = useSessionStore((s) => s.status);

  useCartSessionSync();
  useFavoritesSessionSync();
  useReviewsSessionSync();
  useSessionRestore();

  if (status === 'restoring') {
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
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <RootNavigation />
        </ErrorBoundary>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}