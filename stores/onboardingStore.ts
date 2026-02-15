import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import zustandStorage from './storage';

type QuizAnswers = Record<string, string>;

interface OnboardingState {
  hasSeenStoreReview: boolean;
  isOnboardingCompleted: boolean;
  quizAnswers: QuizAnswers;
  setHasSeenStoreReview: (value: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setQuizAnswer: (questionId: string, answerId: string) => void;
  resetQuizAnswers: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenStoreReview: false,
      isOnboardingCompleted: false,
      quizAnswers: {},
      setHasSeenStoreReview: (value) => set({ hasSeenStoreReview: value }),
      setOnboardingCompleted: (completed) => set({ isOnboardingCompleted: completed }),
      setQuizAnswer: (questionId, answerId) =>
        set((state) => ({
          quizAnswers: {
            ...state.quizAnswers,
            [questionId]: answerId,
          },
        })),
      resetQuizAnswers: () => set({ quizAnswers: {} }),
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
