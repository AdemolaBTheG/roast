import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import "@/i18n";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { enableScreens } from "react-native-screens";
import "../global.css";

const queryClient = new QueryClient();

enableScreens();

export default function RootLayout() {
  const { isReady } = useAppInitialization();
  const subscription = useSubscriptionStatus();

  if (!isReady) return null;

  return (
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
            </Stack>
          </KeyboardProvider>
        </QueryClientProvider>
      </SubscriptionProvider>
    </GestureHandlerRootView>
  );
}
