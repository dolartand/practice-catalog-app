import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useAppSettingsStore, type ThemePreference } from '@shared/lib';

const OPTIONS: ThemePreference[] = ['light', 'dark', 'system'];

const CONTAINER_PADDING = 4;
const CONTAINER_RADIUS = 16;
const THUMB_RADIUS = CONTAINER_RADIUS - CONTAINER_PADDING;
const THUMB_HEIGHT = 36;

export const ThemeSwitcher = () => {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const active = useAppSettingsStore((s) => s.themePreference);
  const setThemePreference = useAppSettingsStore((s) => s.setThemePreference);
  const activeIndex = OPTIONS.indexOf(active);

  const [segmentWidth, setSegmentWidth] = useState(0);
  const translateX = useSharedValue(0);

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const totalWidth = e.nativeEvent.layout.width;
    const width = (totalWidth - CONTAINER_PADDING * 2) / OPTIONS.length;
    setSegmentWidth(width);
    // eslint-disable-next-line react-hooks/immutability
    translateX.value = width * activeIndex;
  };

  useEffect(() => {
    if (segmentWidth > 0) {
      // eslint-disable-next-line react-hooks/immutability
      translateX.value = withTiming(segmentWidth * activeIndex, { duration: 220 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, segmentWidth]);

  return (
    <View onLayout={handleLayout} style={styles.container}>
      <Animated.View
        style={[
          styles.thumb,
          { width: segmentWidth, backgroundColor: theme.colors.primary, opacity: segmentWidth > 0 ? 1 : 0 },
          thumbAnimatedStyle,
        ]}
      />

      {OPTIONS.map((option) => {
        const isActive = option === active;
        return (
          <Pressable
            key={option}
            onPress={() => setThemePreference(option)}
            style={styles.option}
          >
            <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
              {t(`settings.theme_${option}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: CONTAINER_RADIUS,
    padding: CONTAINER_PADDING,
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    top: CONTAINER_PADDING,
    left: CONTAINER_PADDING,
    height: THUMB_HEIGHT,
    borderRadius: THUMB_RADIUS,
  },
  option: { flex: 1, zIndex: 1, alignItems: 'center', justifyContent: 'center', height: THUMB_HEIGHT },
  optionText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
  optionTextActive: { fontWeight: '700', color: '#FFFFFF' },
}));
