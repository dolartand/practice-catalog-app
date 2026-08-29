import { router } from 'expo-router';
import { type PropsWithChildren } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSessionStore } from '@stores/sessionStore';

import { ROUTES } from '@shared/lib';

export const AuthGuard = ({ children }: PropsWithChildren) => {
    const isAuthenticated = useSessionStore((s) => s.isAuthenticated);

    if (!isAuthenticated) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <Text style={{ marginBottom: 16, textAlign: 'center' }}>
                    Войдите, чтобы получить доступ к этому разделу
                </Text>
                <Pressable onPress={() => router.push(ROUTES.auth.login)}>
                    <Text style={{ fontWeight: '600' }}>Войти</Text>
                </Pressable>
            </View>
        );
    }

    return children;
};
