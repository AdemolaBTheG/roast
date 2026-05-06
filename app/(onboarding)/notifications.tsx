import { ONBOARDING_AI_CONSENT_ROUTE } from '@/constants/onboarding-quiz';
import { AppTheme } from '@/constants/Theme';
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
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { OneSignal } from 'react-native-onesignal';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NOTIFICATION_CARD_ICON = require('../../assets/images/roast.icon/Assets/ChatGPT Image 14. Feb. 2026, 19_41_11.png');
const NOTIFICATION_CARD_ICON_FALLBACK = require('../../assets/images/splash-icon.png');

export default function OnboardingNotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const posthog = usePostHog();
  const isIOS = process.env.EXPO_OS === 'ios';
  const previewItems = [
    {
      title: t('onboarding.notifications.item_0.title'),
      body: t('onboarding.notifications.item_0.body'),
      time: t('onboarding.notifications.item_0.time'),
    },
    {
      title: t('onboarding.notifications.item_1.title'),
      body: t('onboarding.notifications.item_1.body'),
      time: t('onboarding.notifications.item_1.time'),
    },
    {
      title: t('onboarding.notifications.item_2.title'),
      body: t('onboarding.notifications.item_2.body'),
      time: t('onboarding.notifications.item_2.time'),
    },
  ];

  useEffect(() => {
    posthog?.capture('screen_viewed', {
      screen_name: 'onboarding_notifications',
    });
  }, [posthog]);

  const handleContinue = async () => {
    if (isIOS) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const granted = await OneSignal.Notifications.requestPermission(false);
      posthog?.capture('onboarding_notifications_configured', {
        source: 'onboarding_notifications',
        permission_granted: granted,
      });
    } catch {}

    router.replace(ONBOARDING_AI_CONSENT_ROUTE as any);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + AppTheme.spacing.lg }]}>
        <NotificationProgressBar progress={1} />

        <Text selectable style={styles.title}>
          {t('onboarding.notifications.title')}
        </Text>
        <Text selectable style={styles.subtitle}>
          {t('onboarding.notifications.subtitle')}
        </Text>

        <View style={styles.stackContainer}>
          {previewItems.map((item, index) => (
            <PreviewItem key={item.title} index={index} item={item} width={width} />
          ))}
        </View>
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
              {t('onboarding.notifications.continue')}
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
            onClick={() => {
              void handleContinue();
            }}
            colors={{ containerColor: AppTheme.colors.primary, contentColor: '#FFFFFF' }}>
            {t('onboarding.notifications.continue')}
          </AndroidButton>
        </View>
      )}
    </View>
  );
}

function PreviewItem({
  index,
  item,
  width,
}: {
  index: number;
  item: { title: string; body: string; time: string };
  width: number;
}) {
  const appear = useSharedValue(0);
  const [useFallbackIcon, setUseFallbackIcon] = useState(false);

  useEffect(() => {
    appear.value = withDelay(index * 300, withTiming(1, { duration: 450 }));
  }, [appear, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [
      {
        scale: interpolate(appear.value, [0, 1], [0.95, 1]),
      },
      {
        translateY: interpolate(appear.value, [0, 1], [-12 + index * 14, index * 14]),
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.previewCard,
        {
          width: width * 0.9,
          top: index * 18,
        },
        animatedStyle,
      ]}>
      <Image
        source={useFallbackIcon ? NOTIFICATION_CARD_ICON_FALLBACK : NOTIFICATION_CARD_ICON}
        onError={() => {
          setUseFallbackIcon(true);
        }}
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
        }}
      />

      <View style={{ flex: 1 }}>
        <View style={styles.previewHeader}>
          <Text selectable style={styles.previewTitle}>
            {item.title}
          </Text>
          <Text selectable style={styles.previewTime}>
            {item.time}
          </Text>
        </View>
        <Text selectable style={styles.previewBody}>
          {item.body}
        </Text>
      </View>
    </Animated.View>
  );
}

function NotificationProgressBar({ progress }: { progress: number }) {
  const clampedProgress = Math.max(0, Math.min(progress, 1));

  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${clampedProgress * 100}%`,
          },
        ]}
      />
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
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: AppTheme.colors.primary,
  },
  title: {
    marginTop: AppTheme.spacing.xl,
    fontSize: 34,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: AppTheme.spacing.sm,
    fontSize: 17,
    color: 'rgba(0,0,0,0.55)',
    textAlign: 'center',
    lineHeight: 24,
  },
  stackContainer: {
    width: '100%',
    marginTop: 92,
    height: 260,
    alignItems: 'center',
  },
  previewCard: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#fff',
    boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
    borderCurve: 'continuous',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  previewTime: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.55)',
  },
  previewBody: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.7)',
    lineHeight: 20,
  },
});
