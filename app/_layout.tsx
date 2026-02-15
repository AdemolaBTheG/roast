import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import "@/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { PostHogProvider } from "posthog-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { enableScreens } from "react-native-screens";
import "../global.css";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://379e05fe47d7a52753f131a7da77f013@o4509184946536448.ingest.de.sentry.io/4510886638321744',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: false,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

const queryClient = new QueryClient();
const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

enableScreens();

export default Sentry.wrap(function RootLayout() {
  const { isReady } = useAppInitialization();
  const subscription = useSubscriptionStatus();

  if (!isReady) return null;

  const appTree = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SubscriptionProvider value={subscription}>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>
            <Stack>
              <Stack.Screen name="(add)" options={{ headerShown: false,presentation:'modal' }} />
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(home)" options={{ headerShown: false }} />
              <Stack.Screen name="(item)" options={{ headerShown: false,presentation:'modal' }} />
              <Stack.Screen name="(settings)" options={{ headerShown: false }} />
              <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
              <Stack.Screen name="(paywalls)" options={{ headerShown: false,presentation:'fullScreenModal' }} />

            </Stack>
          </KeyboardProvider>
        </QueryClientProvider>
      </SubscriptionProvider>
    </GestureHandlerRootView>
  );

  if (!posthogApiKey) {
    return appTree;
  }

  return (
    <PostHogProvider
      apiKey={posthogApiKey}
      options={{
        host: posthogHost,
      }}
    >
      {appTree}
    </PostHogProvider>
  );
});