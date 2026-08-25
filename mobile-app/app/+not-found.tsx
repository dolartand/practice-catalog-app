import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>Страница не найдена</Text>
        <Link href="/">
          <Text style={{ color: '#0A6EBD' }}>Вернуться на главную</Text>
        </Link>
      </View>
    </>
  );
}