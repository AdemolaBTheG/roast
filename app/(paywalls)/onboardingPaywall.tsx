import { Redirect } from 'expo-router';

export default function OnboardingPaywallRoute() {
  return <Redirect href="/(paywalls)?source=onboarding_quiz" />;
}
