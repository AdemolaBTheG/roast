import { useOnboardingStore } from '@/stores/onboardingStore';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isOnboardingCompleted } = useOnboardingStore();

  if (isOnboardingCompleted) {
    return <Redirect href="/(home)" />;
  } else {
    return <Redirect href="/(onboarding)" />;
  }
}
