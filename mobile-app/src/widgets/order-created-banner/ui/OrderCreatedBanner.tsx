import { CheckCircle2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export function OrderCreatedBanner() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    opacity.value = withDelay(2200, withTiming(0, { duration: 300 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.banner, animatedStyle]}>
      <CheckCircle2 size={18} color={theme.colors.success} />
      <Text style={styles.text}>{t('checkout.order_created')}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: theme.gap(1),
    backgroundColor: `${theme.colors.success}18`, borderRadius: 12,
    paddingHorizontal: theme.gap(1.5), paddingVertical: theme.gap(1),
    marginBottom: theme.gap(2),
  },
  text: { color: theme.colors.success, fontWeight: '600', fontSize: 13 },
}));