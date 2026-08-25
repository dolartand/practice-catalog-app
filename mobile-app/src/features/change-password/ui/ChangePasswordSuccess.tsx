import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export function ChangePasswordSuccess({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    const timer = setTimeout(onDone, 1000);
    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.circle, { backgroundColor: theme.colors.primary }, animatedStyle]}>
        <Check size={32} color="#fff" />
      </Animated.View>
      <Text style={styles.text}>{t('auth.change_password_success')}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.gap(2) },
  circle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
}));