import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

interface SkeletonProps {
  style?: ViewStyle;
  radius?: number;
}

export function Skeleton({ style, radius = 8 }: SkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.4, { duration: 700 })), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.base, { borderRadius: radius }, style, animatedStyle]} />;
}

const styles = StyleSheet.create((theme) => ({
  base: { backgroundColor: theme.colors.border },
}));