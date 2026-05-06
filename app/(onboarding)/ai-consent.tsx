import { ONBOARDING_PAYWALL_ROUTE } from '@/constants/onboarding-quiz';
import { AppTheme } from '@/constants/Theme';
import { useAiConsentStore } from '@/stores/aiConsentStore';
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
import { router, useLocalSearchParams } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HOME_ROUTE = '/(home)';

export default function OnboardingAiConsentScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const posthog = usePostHog();
  const grantAiConsent = useAiConsentStore((state) => state.grantAiConsent);
  const setOnboardingCompleted = useOnboardingStore((state) => state.setOnboardingCompleted);
  const { source } = useLocalSearchParams<{ source?: string | string[] }>();
  const sourceParam = Array.isArray(source) ? source[0] : source;
  const isGenerateGateSource = sourceParam === 'generate_gate';
  const isIOS = process.env.EXPO_OS === 'ios';

  useEffect(() => {
    posthog?.capture('screen_viewed', {
      screen_name: 'onboarding_ai_consent',
      source: sourceParam ?? 'onboarding',
    });
  }, [posthog, sourceParam]);

  const exitAfterDecision = () => {
    if (isGenerateGateSource) {
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace(HOME_ROUTE as any);
      return;
    }

    setOnboardingCompleted(true);
    router.replace(ONBOARDING_PAYWALL_ROUTE as any);
  };

  const handleAllow = async () => {
    if (isIOS) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    grantAiConsent();
    posthog?.capture('ai_data_consent_granted', {
      source: sourceParam ?? 'onboarding',
    });
    exitAfterDecision();
  };

  const handleDecline = async () => {
    if (isIOS) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    posthog?.capture('ai_data_consent_declined', {
      source: sourceParam ?? 'onboarding',
    });

    if (!isGenerateGateSource) {
      setOnboardingCompleted(true);
      router.replace(HOME_ROUTE as any);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(HOME_ROUTE as any);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + AppTheme.spacing.xl }]}>
        <Text selectable style={styles.title}>
          {t('add.aiConsent.title')}
        </Text>
        <Text selectable style={styles.subtitle}>
          {t('add.aiConsent.body')}
        </Text>
      </View>

      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + AppTheme.spacing.lg,
          width: width * 0.8,
          alignSelf: 'center',
          gap: 12,
        }}
      >
        {isIOS ? (
          <>
            <Host matchContents useViewportSizeMeasurement style={{ alignSelf: 'center' }}>
              <Button
                onPress={() => {
                  void handleAllow();
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
                  {t('add.aiConsent.allow')}
                </IOSText>
              </Button>
            </Host>
            <Host matchContents useViewportSizeMeasurement style={{ alignSelf: 'center' }}>
              <Button
                onPress={() => {
                  void handleDecline();
                }}
                modifiers={[
                  buttonStyle(isLiquidGlassAvailable() ? 'glass' : 'plain'),
                  controlSize('regular'),
                ]}
              >
                <IOSText
                  modifiers={[
                    font({ size: 16, weight: 'regular' }),
                    padding({ horizontal: 12, vertical: 4 }),
                    frame({ width: width * 0.8 }),
                  ]}
                >
                  {t('add.aiConsent.decline')}
                </IOSText>
              </Button>
            </Host>
          </>
        ) : (
          <>
            <AndroidButton
              onClick={() => {
                void handleAllow();
              }}
              colors={{ containerColor: AppTheme.colors.primary, contentColor: '#FFFFFF' }}
            >
              {t('add.aiConsent.allow')}
            </AndroidButton>
            <AndroidButton
              onClick={() => {
                void handleDecline();
              }}
              colors={{ containerColor: '#6B7280', contentColor: '#FFFFFF' }}
            >
              {t('add.aiConsent.decline')}
            </AndroidButton>
          </>
        )}
      </View>
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
    gap: AppTheme.spacing.md,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(0,0,0,0.65)',
    textAlign: 'center',
    lineHeight: 24,
  },
});
