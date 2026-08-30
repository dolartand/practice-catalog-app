import { router } from 'expo-router';
import { type PropsWithChildren } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSessionStore } from '@stores/sessionStore';
import { useTranslation } from 'react-i18next';

import { ROUTES } from '@shared/lib';

export const AuthGuard = ({ children }: PropsWithChildren) => {
    const { t } = useTranslation();
    const isAuthenticated = useSessionStore((s) => s.status === 'authenticated');

    if (!isAuthenticated) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <Text style={{ marginBottom: 16, textAlign: 'center' }}>
                    {t('auth.placeholder_hint')}
                </Text>
                <Pressable onPress={() => router.push(ROUTES.auth.login)}>
                    <Text style={{ fontWeight: '600' }}>{t('auth.login_submit')}</Text>
                </Pressable>
            </View>
        );
    }

    return children;
};
