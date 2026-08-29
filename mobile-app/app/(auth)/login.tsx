import { Link, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { LoginForm } from '@features/login/ui/LoginForm';
import { ROUTES } from '@shared/lib';

export default function LoginScreen() {
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.screen}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Pressable onPress={() => router.back()} hitSlop={8}>
                    <ChevronLeft size={24} color={theme.colors.text} />
                </Pressable>
                <Text style={styles.title}>{t('auth.login_title')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <LoginForm />
                <Link href={ROUTES.auth.register} style={styles.link}>
                    {t('auth.go_to_register')}
                </Link>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.gap(2.5),
    },
    title: { fontSize: 24, color: theme.colors.text },
    content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: theme.gap(2.5) },
    link: { marginTop: theme.gap(2), color: theme.colors.primary, textAlign: 'center' },
}));