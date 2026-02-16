import { AppTheme } from '@/constants/Theme';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { Button as AndroidButton } from '@expo/ui/jetpack-compose';
import { Button, Host, Text as IOSText } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  controlSize,
  disabled,
  font,
  frame,
  padding,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { usePostHog } from 'posthog-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_TOTAL_STEPS = 4;
const DEFAULT_SOURCE = 'onboarding_quiz';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const ACCENT = AppTheme.colors.primary;

export type QuizOption = {
  id: string;
  label: string;
  icon: string;
};

export type QuizScreenConfig = {
  questionId: string;
  title: string;
  subtitle: string;
  options: QuizOption[];
  step: number;
  ctaLabel: string;
  nextRoute: string;
  totalSteps?: number;
  completeOnContinue?: boolean;
  source?: string;
};

export default function QuizScreenView({ config }: { config: QuizScreenConfig }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isIOS = process.env.EXPO_OS === 'ios';
  const posthog = usePostHog();
  const storedSelection = useOnboardingStore((state) => state.quizAnswers[config.questionId] ?? null);
  const setQuizAnswer = useOnboardingStore((state) => state.setQuizAnswer);
  const setOnboardingCompleted = useOnboardingStore((state) => state.setOnboardingCompleted);
  const [selected, setSelected] = useState<string | null>(storedSelection);
  const totalSteps = config.totalSteps ?? DEFAULT_TOTAL_STEPS;
  const progress = config.step / totalSteps;
  const source = config.source ?? DEFAULT_SOURCE;

  useEffect(() => {
    setSelected(storedSelection);
  }, [storedSelection, config.questionId]);

  async function handleSelect(optionId: string) {
    if (isIOS) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setQuizAnswer(config.questionId, optionId);
    setSelected(optionId);
  }

  async function handleContinue() {
    if (!selected) return;
    if (isIOS) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setQuizAnswer(config.questionId, selected);
    if (config.completeOnContinue) {
      setOnboardingCompleted(true);
      posthog?.capture('onboarding_quiz_completed', {
        source,
      });
    }
    router.push(config.nextRoute as any);
  }

  return (
    <View className="flex-1 items-center px-4" style={{ paddingTop: insets.top + 24 }}>
      <ProgressBar progress={progress} />

      <Text selectable className="mt-12 text-3xl font-semibold text-center">
        {config.title}
      </Text>
      <Text selectable className="text-center text-black/60 mt-2">
        {config.subtitle}
      </Text>

      <View className="flex items-center justify-center w-full gap-4 mt-10">
        {config.options.map((option) => (
          <AnswerCard
            key={option.id}
            option={option}
            isSelected={selected === option.id}
            onPress={handleSelect}
          />
        ))}
      </View>

      {isIOS ? (
        <Host
          matchContents
          useViewportSizeMeasurement
          style={{
            position: 'absolute',
            bottom: insets.bottom + 12,
            alignSelf: 'center',
          }}>
          <Button
            onPress={() => {
              void handleContinue();
            }}
            modifiers={[
              buttonStyle(isLiquidGlassAvailable() ? 'glassProminent' : 'borderedProminent'),
              tint(ACCENT),
              disabled(selected === null),
              controlSize('regular'),
            ]}>
            <IOSText
              modifiers={[
                font({ size: 17, weight: 'medium' }),
                padding({ horizontal: 12, vertical: 6 }),
                frame({ width: width * 0.8 }),
              ]}>
              {config.ctaLabel}
            </IOSText>
          </Button>
        </Host>
      ) : (
        <View
          style={{
            width: width * 0.8,
            position: 'absolute',
            bottom: insets.bottom + 12,
            alignSelf: 'center',
          }}>
          <AndroidButton
            onPress={() => {
              void handleContinue();
            }}
            disabled={selected === null}
            color={ACCENT}>
            {config.ctaLabel}
          </AndroidButton>
        </View>
      )}
    </View>
  );
}

function AnswerCard({
  option,
  isSelected,
  onPress,
}: {
  option: QuizOption;
  isSelected: boolean;
  onPress: (id: string) => void;
}) {
  const scale = useSharedValue(1);
  const focused = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    focused.value = withTiming(isSelected ? 1 : 0);
  }, [focused, isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(focused.value, [0, 1], ['#fff', ACCENT]),
    backgroundColor: interpolateColor(focused.value, [0, 1], ['#ffffff', `${ACCENT}33`]),
  }));

  function onPressIn() {
    scale.value = withTiming(0.95);
  }

  function onPressOut() {
    scale.value = withTiming(1);
    onPress(option.id);
  }

  return (
    <AnimatedPressable
      onPressIn={() => onPressIn()}
      onPressOut={() => onPressOut()}
      className="flex-row items-center gap-3 px-4 py-3 w-full border-2 rounded-2xl"
      style={[animatedStyle, { borderCurve: 'continuous', minHeight: 56 }]}>
      <View
        className="w-11 h-11 rounded-xl items-center justify-center"
        style={{
          borderCurve: 'continuous',
          backgroundColor: isSelected ? ACCENT : `${ACCENT}18`,
        }}>
        <SymbolView
          name={{ ios: option.icon as any, android: 'circle' }}
          size={22}
          tintColor={isSelected ? '#FFFFFF' : ACCENT}
        />
      </View>
      <Text
        className="text-base font-semibold flex-1"
        style={{ color: isSelected ? ACCENT : '#000' }}>
        {option.label}
      </Text>
      {isSelected && (
        <SymbolView
          name={{ ios: 'checkmark.circle.fill', android: 'check_circle' }}
          size={22}
          tintColor={ACCENT}
        />
      )}
    </AnimatedPressable>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const clampedProgress = Math.max(0, Math.min(progress, 1));

  return (
    <View
      style={{
        width: '100%',
        height: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: `${clampedProgress * 100}%`,
          height: '100%',
          backgroundColor: ACCENT,
        }}
      />
    </View>
  );
}
