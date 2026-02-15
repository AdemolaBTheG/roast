import type { QuizScreenConfig } from '@/components/nutrients-carousel/onboarding/quiz-screen';
import type { TFunction } from 'i18next';

const TOTAL_STEPS = 4;
export const ONBOARDING_PAYWALL_ROUTE = '/(paywalls)?source=onboarding_quiz';
export const ONBOARDING_RATING_ROUTE = '/(onboarding)/rating';
export const ONBOARDING_NOTIFICATIONS_ROUTE = '/(onboarding)/notifications';

const painSupportMap: Record<string, string> = {
  blank_replies: 'onboarding.quiz.dynamic.q1_pain.blank_replies',
  too_harsh: 'onboarding.quiz.dynamic.q1_pain.too_harsh',
  repetitive: 'onboarding.quiz.dynamic.q1_pain.repetitive',
  too_slow: 'onboarding.quiz.dynamic.q1_pain.too_slow',
};

function getPainSupportSubtitle(t: TFunction, painPoint?: string) {
  const key = painSupportMap[painPoint ?? ''];
  return key ? t(key) : t('onboarding.quiz.dynamic.q1_pain.default');
}

export function getOnboardingQuizConfigs(
  quizAnswers: Record<string, string>,
  t: TFunction,
): QuizScreenConfig[] {
  const painSupportSubtitle = getPainSupportSubtitle(t, quizAnswers.q1_pain);

  return [
    {
      questionId: 'q1_pain',
      title: t('onboarding.quiz.q1.title'),
      subtitle: t('onboarding.quiz.q1.subtitle'),
      options: [
        { id: 'blank_replies', label: t('onboarding.quiz.q1.options.blank_replies'), icon: 'brain.head.profile' },
        { id: 'too_harsh', label: t('onboarding.quiz.q1.options.too_harsh'), icon: 'exclamationmark.triangle.fill' },
        { id: 'repetitive', label: t('onboarding.quiz.q1.options.repetitive'), icon: 'repeat' },
        { id: 'too_slow', label: t('onboarding.quiz.q1.options.too_slow'), icon: 'timer' },
      ],
      step: 1,
      totalSteps: TOTAL_STEPS,
      ctaLabel: t('onboarding.quiz.q1.cta'),
      nextRoute: '/(onboarding)/quiz/2',
      source: 'onboarding_quiz',
    },
    {
      questionId: 'q2_context',
      title: t('onboarding.quiz.q2.title'),
      subtitle: painSupportSubtitle,
      options: [
        { id: 'group_chat', label: t('onboarding.quiz.q2.options.group_chat'), icon: 'bubble.left.and.bubble.right.fill' },
        { id: 'comments', label: t('onboarding.quiz.q2.options.comments'), icon: 'text.bubble.fill' },
        { id: 'dm', label: t('onboarding.quiz.q2.options.dm'), icon: 'paperplane.fill' },
        { id: 'irl', label: t('onboarding.quiz.q2.options.irl'), icon: 'person.2.fill' },
      ],
      step: 2,
      totalSteps: TOTAL_STEPS,
      ctaLabel: t('onboarding.quiz.q2.cta'),
      nextRoute: '/(onboarding)/quiz/3',
      source: 'onboarding_quiz',
    },
    {
      questionId: 'q3_tone',
      title: t('onboarding.quiz.q3.title'),
      subtitle: t('onboarding.quiz.q3.subtitle'),
      options: [
        { id: 'playful', label: t('onboarding.quiz.q3.options.playful'), icon: 'face.smiling.fill' },
        { id: 'savage', label: t('onboarding.quiz.q3.options.savage'), icon: 'flame.fill' },
        { id: 'unhinged', label: t('onboarding.quiz.q3.options.unhinged'), icon: 'bolt.fill' },
      ],
      step: 3,
      totalSteps: TOTAL_STEPS,
      ctaLabel: t('onboarding.quiz.q3.cta'),
      nextRoute: '/(onboarding)/quiz/4',
      source: 'onboarding_quiz',
    },
    {
      questionId: 'q4_goal',
      title: t('onboarding.quiz.q4.title'),
      subtitle: t('onboarding.quiz.q4.subtitle'),
      options: [
        { id: 'never_blank', label: t('onboarding.quiz.q4.options.never_blank'), icon: 'bolt.badge.clock.fill' },
        { id: 'more_reactions', label: t('onboarding.quiz.q4.options.more_reactions'), icon: 'hand.thumbsup.fill' },
        { id: 'funny_not_toxic', label: t('onboarding.quiz.q4.options.funny_not_toxic'), icon: 'checkmark.shield.fill' },
        { id: 'save_time', label: t('onboarding.quiz.q4.options.save_time'), icon: 'clock.fill' },
      ],
      step: 4,
      totalSteps: TOTAL_STEPS,
      ctaLabel: t('onboarding.quiz.q4.cta'),
      nextRoute: ONBOARDING_RATING_ROUTE,
      source: 'onboarding_quiz',
      completeOnContinue: true,
    },
  ];
}
