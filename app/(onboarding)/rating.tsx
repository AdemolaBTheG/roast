import { ONBOARDING_NOTIFICATIONS_ROUTE } from '@/constants/onboarding-quiz';
import { AppTheme } from '@/constants/theme';
import { useOnboardingStore } from '@/stores/onboardingStore';
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
import * as StoreReview from 'expo-store-review';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { usePostHog } from 'posthog-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OnboardingRatingScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const hasSeenStoreReview = useOnboardingStore((state) => state.hasSeenStoreReview);
  const setHasSeenStoreReview = useOnboardingStore((state) => state.setHasSeenStoreReview);
  const isIOS = process.env.EXPO_OS === 'ios';

  useEffect(() => {
    posthog?.capture('screen_viewed', {
      screen_name: 'onboarding_rating',
    });
  }, [posthog]);

  const handleContinue = async () => {
    if (isIOS) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!hasSeenStoreReview) {
      try {
        const canRequestReview = await StoreReview.hasAction();
        if (canRequestReview) {
          await StoreReview.requestReview();
          posthog?.capture('onboarding_store_review_requested', {
            source: 'onboarding_rating',
          });
        }
      } catch {} finally {
        setHasSeenStoreReview(true);
      }
    }

    router.replace(ONBOARDING_NOTIFICATIONS_ROUTE as any);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + AppTheme.spacing.xl }]}>
        <LottieView
          autoPlay
          loop
          source={require('../../assets/animations/rating.json')}
          style={styles.animation}
        />

        <Text selectable style={styles.title}>
          {t('onboarding.rating.title')}
        </Text>
        <Text selectable style={styles.subtitle}>
          {t('onboarding.rating.subtitle')}
        </Text>
      </View>

      {isIOS ? (
        <Host
          matchContents
          useViewportSizeMeasurement
          style={{
            position: 'absolute',
            bottom: insets.bottom + AppTheme.spacing.lg,
            alignSelf: 'center',
            zIndex: 10,
          }}>
          <Button
            onPress={() => {
              void handleContinue();
            }}
            modifiers={[
              buttonStyle(isLiquidGlassAvailable() ? 'glassProminent' : 'borderedProminent'),
              tint(AppTheme.colors.primary),
              controlSize('regular'),
            ]}>
            <IOSText
              modifiers={[
                font({ size: 17, weight: 'medium' }),
                padding({ horizontal: 12, vertical: 6 }),
                frame({ width: width * 0.8 }),
              ]}>
              {t('onboarding.rating.continue')}
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
          }}>
          <AndroidButton
            onPress={() => {
              void handleContinue();
            }}
            color={AppTheme.colors.primary}>
            {t('onboarding.rating.continue')}
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
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.lg,
  },
  animation: {
    width: 280,
    height: 280,
    marginTop: AppTheme.spacing.xxl,
    marginBottom: AppTheme.spacing.md,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: AppTheme.spacing.sm,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(0,0,0,0.55)',
    textAlign: 'center',
    lineHeight: 24,
  },
});
