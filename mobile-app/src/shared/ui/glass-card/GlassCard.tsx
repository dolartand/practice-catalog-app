// src/shared/ui/glass-card/GlassCard.tsx
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { type PropsWithChildren, useMemo } from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

interface GlassCardProps extends PropsWithChildren {
    style?: ViewStyle;
}

export function GlassCard({ children, style }: GlassCardProps) {
    // Поддержка нативного стекла известна до первого рендера — состояние не нужно
    const canUseNativeGlass = useMemo(
        () => Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable(),
        [],
    );

    if (canUseNativeGlass) {
        return (
            <GlassView style={[styles.card, style]} tintColor="default">
                <View style={styles.content}>{children}</View>
            </GlassView>
        );
    }

    // Android и iOS < 26 — реальный блюр вместо системного эффекта,
    // визуально это ближе к "стеклу", чем просто полупрозрачная заливка
    return (
        <View style={[styles.card, styles.blurWrapper, style]}>
            <BlurView
                intensity={40}
                tint="light"
                experimentalBlurMethod="dimezisBlurView" // на Android даёт настоящий блюр, а не имитацию
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.content}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create((theme) => ({
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    blurWrapper: {
        backgroundColor: `${theme.colors.surface}66`, // подложка под блюр, чтобы не просвечивало насквозь
    },
    content: {
        padding: theme.gap(2),
    },
}));