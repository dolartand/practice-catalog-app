import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="about" options={{ presentation: 'modal' }} />
      <Stack.Screen name="change-password" options={{ presentation: 'card' }} />
      <Stack.Screen name="orders/index" />
      <Stack.Screen name="orders/[orderId]" />
    </Stack>
  );
}
