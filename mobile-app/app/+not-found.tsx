import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
    const { t } = useTranslation();
    return (
        <>
            <Stack.Screen options={{ title: t('common.oops') }} />
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '600' }}>{t('common.not_found')}</Text>
                <Link href="/">
                    <Text style={{ color: '#0A6EBD' }}>{t('common.go_home')}</Text>
                </Link>
            </View>
        </>
    );
}