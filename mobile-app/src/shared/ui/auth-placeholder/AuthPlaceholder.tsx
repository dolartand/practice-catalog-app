import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

interface AuthPlaceholderProps {
    onLogin: () => void;
}

export const AuthPlaceholder = ({ onLogin }: AuthPlaceholderProps) => {
    const { t } = useTranslation();
    const { theme } = useUnistyles();

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Lock size={40} color={theme.colors.textSecondary} style={styles.icon} />
                <Text style={styles.title}>{t('auth.placeholder_title')}</Text>
                <Text style={styles.hint}>{t('auth.placeholder_hint')}</Text>
                <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={onLogin}>
                    <Text style={styles.buttonText}>{t('auth.login_submit')}</Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create((theme) => ({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.gap(3) },
    card: {
        alignItems: 'center',
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.gap(4),
        paddingHorizontal: theme.gap(3),
    },
    icon: { marginBottom: theme.gap(1.5) },
    title: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: theme.gap(1) },
    hint: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.gap(2.5),
    },
    button: {
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        paddingVertical: theme.gap(1.5),
        paddingHorizontal: theme.gap(3),
    },
    pressed: { opacity: 0.7 },
    buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
}));