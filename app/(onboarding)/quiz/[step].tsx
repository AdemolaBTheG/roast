import QuizScreenView from '@/components/nutrients-carousel/onboarding/quiz-screen';
import { getOnboardingQuizConfigs } from '@/constants/onboarding-quiz';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

const FALLBACK_ROUTE = '/(onboarding)/quiz/1';

export default function OnboardingQuizStepScreen() {
  const { step } = useLocalSearchParams<{ step?: string | string[] }>();
  const quizAnswers = useOnboardingStore((state) => state.quizAnswers);
  const { t } = useTranslation();

  const parsedStep = Number(Array.isArray(step) ? step[0] : step);
  if (!Number.isInteger(parsedStep)) {
    return <Redirect href={FALLBACK_ROUTE} />;
  }

  const configs = getOnboardingQuizConfigs(quizAnswers, t);
  const config = configs.find((entry) => entry.step === parsedStep);

  if (!config) {
    return <Redirect href={FALLBACK_ROUTE} />;
  }

  return <QuizScreenView config={config} />;
}
