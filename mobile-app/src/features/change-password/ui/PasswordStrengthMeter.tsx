import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { calculatePasswordStrength } from '../lib/password-strength';

const LEVEL_LABELS = ['weak', 'medium', 'strong'] as const;

// Хуки нельзя вызывать в map-колбэке — сегмент вынесен в компонент
function Segment({ isFilled, color }: { isFilled: boolean; color: string }) {
  const { theme } = useUnistyles();

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isFilled ? 1 : 0.15, { duration: 180 }),
    backgroundColor: isFilled ? color : theme.colors.border,
  }));

  return <Animated.View style={[styles.segment, animatedStyle]} />;
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const strength = calculatePasswordStrength(password);

  if (strength === 0) return null;

  const colors = [theme.colors.danger, theme.colors.warning, theme.colors.success] as const;
  const color = colors[strength - 1] ?? theme.colors.danger;
  const labelKey = LEVEL_LABELS[strength - 1];

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        {[1, 2, 3].map((segment) => (
          <Segment key={segment} isFilled={segment <= strength} color={color} />
        ))}
      </View>
      <Text style={[styles.label, { color }]}>{t(`auth.password_strength.${labelKey}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { flexDirection: 'row', alignItems: 'center', gap: theme.gap(1), marginTop: -theme.gap(0.5) },
  track: { flexDirection: 'row', gap: 4, flex: 1 },
  segment: { height: 4, flex: 1, borderRadius: 2 },
  label: { fontSize: 12, fontWeight: '600', minWidth: 60 },
}));
