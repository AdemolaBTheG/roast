import { useCreditStore } from '@/stores/creditStore';
import { router, useLocalSearchParams } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import React, { useRef } from 'react';
import { View } from 'react-native';
import Purchases from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

const HOME_ROUTE = '/(home)';
const OFFERING_PAYWALL_ONBOARDING_ROUTE = '/(paywalls)/offeringPaywall?source=onboarding_quiz';

export default function Paywall() {
  const restoreCredits = useCreditStore((state) => state.restoreCredits);
  const posthog = usePostHog();
  const { source } = useLocalSearchParams<{ source?: string | string[] }>();
  const sourceParam = Array.isArray(source) ? source[0] : source;
  const isOnboardingQuizFlow = sourceParam === 'onboarding_quiz';
  const purchaseOrRestoreCompletedRef = useRef(false);
  const didNavigateRef = useRef(false);
  const paywallSource = sourceParam ?? 'unknown';

  React.useEffect(() => {
    posthog?.capture('paywall_viewed', {
      source: paywallSource,
      paywall_variant: 'default',
      onboarding_flow: isOnboardingQuizFlow,
    });
  }, [isOnboardingQuizFlow, paywallSource, posthog]);

  const navigateReplaceOnce = (route: string) => {
    if (didNavigateRef.current) return;
    didNavigateRef.current = true;
    router.replace(route as any);
  };

  const syncCreditsFromRevenueCat = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const txns = customerInfo.nonSubscriptionTransactions ?? [];
      if (txns.length > 0) {
        restoreCredits(
          txns.map((tx) => ({
            productIdentifier: tx.productIdentifier,
            transactionIdentifier: tx.transactionIdentifier,
          })),
        );
      }
      return txns.length;
    } catch (error) {
      console.warn('Could not sync purchased credits from RevenueCat', error);
      return 0;
    }
  };

  const handleDefaultExit = () => {
    if (didNavigateRef.current) return;

    if (router.canGoBack()) {
      didNavigateRef.current = true;
      router.back();
    } else {
      navigateReplaceOnce(HOME_ROUTE);
    }
  };

  const handleDismiss = () => {
    // Some paywall SDK flows can dismiss after a successful purchase/restore.
    if (purchaseOrRestoreCompletedRef.current) return;
    posthog?.capture('paywall_dismissed', {
      source: paywallSource,
      paywall_variant: 'default',
      onboarding_flow: isOnboardingQuizFlow,
    });

    if (isOnboardingQuizFlow) {
      navigateReplaceOnce(OFFERING_PAYWALL_ONBOARDING_ROUTE);
      return;
    }
    handleDefaultExit();
  };

  const handlePurchaseCompleted = async () => {
    purchaseOrRestoreCompletedRef.current = true;
    const syncedTransactions = await syncCreditsFromRevenueCat();
    posthog?.capture('paywall_purchase_completed', {
      source: paywallSource,
      paywall_variant: 'default',
      onboarding_flow: isOnboardingQuizFlow,
      synced_transactions: syncedTransactions,
    });

    if (isOnboardingQuizFlow) {
      navigateReplaceOnce(HOME_ROUTE);
      return;
    }
    handleDefaultExit();
  };

  const handleRestoreCompleted = async () => {
    purchaseOrRestoreCompletedRef.current = true;
    const syncedTransactions = await syncCreditsFromRevenueCat();
    posthog?.capture('paywall_restore_completed', {
      source: paywallSource,
      paywall_variant: 'default',
      onboarding_flow: isOnboardingQuizFlow,
      synced_transactions: syncedTransactions,
    });

    if (isOnboardingQuizFlow) {
      navigateReplaceOnce(HOME_ROUTE);
      return;
    }
    handleDefaultExit();
  };

  return (
    <View style={{ flex: 1 }}>
      <RevenueCatUI.Paywall
        onDismiss={() => {
          handleDismiss();
        }}
        onPurchaseCompleted={() => {
          void handlePurchaseCompleted();
        }}
        onRestoreCompleted={() => {
          void handleRestoreCompleted();
        }}
      />
    </View>
  );
}
