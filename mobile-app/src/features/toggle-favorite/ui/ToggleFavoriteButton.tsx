import { Heart } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useFavoriteStore } from '@stores/favoriteStore';
import { useSessionStore } from '@stores/sessionStore';
import { showErrorToast, showToast } from '@shared/lib';

interface ToggleFavoriteButtonProps {
  productId: string;
  /** Диаметр кнопки; иконка масштабируется пропорционально */
  size?: number;
}

export const ToggleFavoriteButton = ({ productId, size = 34 }: ToggleFavoriteButtonProps) => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const isActive = useFavoriteStore((s) => s.has(productId));
  const isPending = useFavoriteStore((s) => s.isPending(productId));
  const isAuthenticated = useSessionStore((s) => s.status === 'authenticated');

  const pressScale = useSharedValue(1);
  // Пик «пружинки» в середине переключения 0↔1; на монтировании без анимации
  const toggleProgress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    toggleProgress.value = withSpring(isActive ? 1 : 0, { damping: 10, stiffness: 240 });
  }, [isActive, toggleProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pressScale.value * (1 + 0.28 * Math.sin(toggleProgress.value * Math.PI)) },
    ],
  }));

  const handlePressIn = () => {
    pressScale.value = withTiming(0.82, { duration: 100 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 12 });
  };

  const handlePress = () => {
    // Каталог публичный — гость получает подсказку, навигацию не дёргаем
    if (!isAuthenticated) {
      showToast(t('favorite.login_required'));
      return;
    }
    // Откат при ошибке делает сам стор; понятный тост — централизованно
    useFavoriteStore.getState().toggle(productId).catch(showErrorToast);
  };

  return (
    <Animated.View style={[styles.button, { width: size, height: size }, isPending && styles.pending, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={8}
        style={styles.hitArea}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
      >
        <Heart
          size={Math.round(size * 0.52)}
          color={isActive ? theme.colors.danger : '#FFFFFF'}
          fill={isActive ? theme.colors.danger : 'transparent'}
        />
      </Pressable>
    </Animated.View>
  );
}

ToggleFavoriteButton.displayName = 'ToggleFavoriteButton';

const styles = StyleSheet.create((theme) => ({
  button: {
    borderRadius: 999,
    backgroundColor: theme.colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pending: { opacity: 0.55 },
  hitArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
}));
