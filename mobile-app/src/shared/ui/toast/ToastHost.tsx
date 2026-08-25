import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { registerToastListener } from '@shared/lib';

const VISIBLE_MS = 2600;

export function ToastHost() {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visible = useSharedValue(0);

  useEffect(() => {
    registerToastListener((next) => {
      setMessage(next);
    });
    return () => registerToastListener(null);
  }, []);

  useEffect(() => {
    if (!message) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    visible.value = withSpring(1, { damping: 16 });
    timerRef.current = setTimeout(() => {
      visible.value = withTiming(0, { duration: 180 });
      timerRef.current = setTimeout(() => setMessage(null), 200);
    }, VISIBLE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ translateY: (1 - visible.value) * 24 }],
  }));

  if (!message) return null;

  return (
    <Animated.View
      style={[styles.toast, { bottom: insets.bottom + 96, backgroundColor: theme.colors.text }, animatedStyle]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      pointerEvents="none"
    >
      <Text style={[styles.text, { color: theme.colors.background }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '86%',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { fontSize: 13.5, fontWeight: '600', textAlign: 'center' },
});
