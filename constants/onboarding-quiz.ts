import type { QuizScreenConfig } from '@/components/nutrients-carousel/onboarding/quiz-screen';
import type { TFunction } from 'i18next';

const TOTAL_STEPS = 4;
export const ONBOARDING_PAYWALL_ROUTE = '/(paywalls)?source=onboarding_quiz';
export const ONBOARDING_RATING_ROUTE = '/(onboarding)/rating';
export const ONBOARDING_NOTIFICATIONS_ROUTE = '/(onboarding)/notifications';
export const ONBOARDING_AI_CONSENT_ROUTE = '/(onboarding)/ai-consent';

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
        {
          id: 'blank_replies',
          label: t('onboarding.quiz.q1.options.blank_replies'),
          icon: { ios: 'brain.head.profile', android: 'neurology', web: 'neurology' },
        },
        {
          id: 'too_harsh',
          label: t('onboarding.quiz.q1.options.too_harsh'),
          icon: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
        },
        {
          id: 'repetitive',
          label: t('onboarding.quiz.q1.options.repetitive'),
          icon: { ios: 'repeat', android: 'repeat', web: 'repeat' },
        },
        {
          id: 'too_slow',
          label: t('onboarding.quiz.q1.options.too_slow'),
          icon: { ios: 'timer', android: 'timer', web: 'timer' },
        },
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
        {
          id: 'group_chat',
          label: t('onboarding.quiz.q2.options.group_chat'),
          icon: { ios: 'bubble.left.and.bubble.right.fill', android: 'forum', web: 'forum' },
        },
        {
          id: 'comments',
          label: t('onboarding.quiz.q2.options.comments'),
          icon: { ios: 'text.bubble.fill', android: 'chat', web: 'chat' },
        },
        {
          id: 'dm',
          label: t('onboarding.quiz.q2.options.dm'),
          icon: { ios: 'paperplane.fill', android: 'send', web: 'send' },
        },
        {
          id: 'irl',
          label: t('onboarding.quiz.q2.options.irl'),
          icon: { ios: 'person.2.fill', android: 'groups', web: 'groups' },
        },
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
        {
          id: 'playful',
          label: t('onboarding.quiz.q3.options.playful'),
          icon: { ios: 'face.smiling.fill', android: 'mood', web: 'mood' },
        },
        {
          id: 'savage',
          label: t('onboarding.quiz.q3.options.savage'),
          icon: {
            ios: 'flame.fill',
            android: 'local_fire_department',
            web: 'local_fire_department',
          },
        },
        {
          id: 'unhinged',
          label: t('onboarding.quiz.q3.options.unhinged'),
          icon: { ios: 'bolt.fill', android: 'bolt', web: 'bolt' },
        },
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
        {
          id: 'never_blank',
          label: t('onboarding.quiz.q4.options.never_blank'),
          icon: { ios: 'bolt.badge.clock.fill', android: 'offline_bolt', web: 'offline_bolt' },
        },
        {
          id: 'more_reactions',
          label: t('onboarding.quiz.q4.options.more_reactions'),
          icon: { ios: 'hand.thumbsup.fill', android: 'thumb_up', web: 'thumb_up' },
        },
        {
          id: 'funny_not_toxic',
          label: t('onboarding.quiz.q4.options.funny_not_toxic'),
          icon: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
        },
        {
          id: 'save_time',
          label: t('onboarding.quiz.q4.options.save_time'),
          icon: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
        },
      ],
      step: 4,
      totalSteps: TOTAL_STEPS,
      ctaLabel: t('onboarding.quiz.q4.cta'),
      nextRoute: ONBOARDING_RATING_ROUTE,
      source: 'onboarding_quiz',
    },
  ];
}
