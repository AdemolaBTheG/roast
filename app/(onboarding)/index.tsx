import { NutrientsCarousel } from '@/components/nutrients-carousel';
import type { NutrientsItem } from '@/components/nutrients-carousel/types';
import { AppTheme } from '@/constants/theme';
import { Button as AndroidButton } from '@expo/ui/jetpack-compose';
import { Button, Host, Text as IOSText } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  controlSize,
  font,
  frame,
  padding,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { usePostHog } from 'posthog-react-native';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInUp, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const carouselBg = StyleSheet.create({
  container: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation();
  const animatedIndex = useSharedValue(0);
  const currentIndex = useSharedValue(0);
  const isIOS = process.env.EXPO_OS === 'ios';

  useEffect(() => {
    posthog?.capture('screen_viewed', {
      screen_name: 'onboarding_carousel',
    });
  }, [posthog]);

  const slides = useMemo<NutrientsItem[]>(
    () => [
      {
        emoji: '\u{1F4F7}',
        description: t('onboarding.carousel.slides.scan'),
        backgroundElement: (
          <View style={carouselBg.container}>
            <SymbolView
              name={{ ios: 'barcode.viewfinder' as any, android: 'circle' }}
              size={80}
              tintColor={AppTheme.colors.primary}
            />
          </View>
        ),
      },
      {
        emoji: '\u2728',
        description: t('onboarding.carousel.slides.ai'),
        backgroundElement: (
          <View style={carouselBg.container}>
            <SymbolView name={{ ios: 'sparkles' as any, android: 'circle' }} size={80} tintColor="#8B5CF6" />
          </View>
        ),
      },
      {
        emoji: '\u{1F6E1}\uFE0F',
        description: t('onboarding.carousel.slides.confidence'),
        backgroundElement: (
          <View style={carouselBg.container}>
            <SymbolView
              name={{ ios: 'shield.checkered' as any, android: 'circle' }}
              size={80}
              tintColor="#3B82F6"
            />
          </View>
        ),
      },
      {
        emoji: '\u{1F50D}',
        description: t('onboarding.carousel.slides.breakdown'),
        backgroundElement: (
          <View style={carouselBg.container}>
            <SymbolView
              name={{ ios: 'list.bullet.rectangle.fill' as any, android: 'circle' }}
              size={80}
              tintColor="#F59E0B"
            />
          </View>
        ),
      },
      {
        emoji: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}',
        description: t('onboarding.carousel.slides.crew'),
        backgroundElement: (
          <View style={carouselBg.container}>
            <SymbolView name={{ ios: 'person.3.fill' as any, android: 'circle' }} size={80} tintColor="#EC4899" />
          </View>
        ),
      },
    ],
    [t],
  );

  const handleContinue = async () => {
    if (isIOS) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    posthog?.capture('onboarding_quiz_started', {
      source: 'onboarding_carousel',
      cta_location: 'onboarding_carousel_footer',
    });
    router.push('/(onboarding)/quiz/1');
  };

  return (
    <View style={styles.container}>
      <NutrientsCarousel slides={slides} animatedIndex={animatedIndex} currentIndex={currentIndex} />

      <Animated.View
        entering={reduceMotion ? undefined : FadeInUp.duration(600).delay(200)}
        style={[styles.topContent, { paddingTop: insets.top + 60 }]}
      >
        <Text selectable style={styles.title}>
          {t('onboarding.carousel.title')}
        </Text>
        <Text selectable style={styles.subtitle}>
          {t('onboarding.carousel.subtitle')}
        </Text>
      </Animated.View>

      {isIOS ? (
        <Host
          matchContents
          useViewportSizeMeasurement
          style={{
            position: 'absolute',
            bottom: insets.bottom + AppTheme.spacing.lg,
            alignSelf: 'center',
            zIndex: 10,
          }}
        >
          <Button
            onPress={() => {
              void handleContinue();
            }}
            modifiers={[
              buttonStyle(isLiquidGlassAvailable() ? 'glassProminent' : 'borderedProminent'),
              tint(AppTheme.colors.primary),
              controlSize('regular'),
            ]}
          >
            <IOSText
              modifiers={[
                font({ size: 17, weight: 'medium' }),
                padding({ horizontal: 12, vertical: 6 }),
                frame({ width: width * 0.8 }),
              ]}
            >
              {t('onboarding.carousel.cta')}
            </IOSText>
          </Button>
        </Host>
      ) : (
        <View
          style={{
            width: width * 0.8,
            position: 'absolute',
            bottom: insets.bottom + AppTheme.spacing.lg,
            alignSelf: 'center',
            zIndex: 10,
          }}
        >
          <AndroidButton
            onPress={() => {
              void handleContinue();
            }}
            color={AppTheme.colors.primary}
          >
            {t('onboarding.carousel.cta')}
          </AndroidButton>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  topContent: {
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
    paddingHorizontal: AppTheme.spacing.lg,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(0,0,0,0.45)',
    textAlign: 'center',
  },
});
