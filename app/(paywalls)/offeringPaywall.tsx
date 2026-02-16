import { useSubscription } from '@/context/SubscriptionContext';
import { useCreditStore } from '@/stores/creditStore';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Purchases, { PurchasesOffering } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

const HOME_ROUTE = '/(home)';

export default function Paywall() {
  const addCredits = useCreditStore((state) => state.addCredits);
  const posthog = usePostHog();
  const [promoOffering, setPromoOffering] = React.useState<PurchasesOffering | null>(null);
  const { isPro } = useSubscription();
  const { source } = useLocalSearchParams<{ source?: string | string[] }>();
  const sourceParam = Array.isArray(source) ? source[0] : source;
  const paywallSource = sourceParam ?? 'settings';

  useEffect(() => {
    posthog?.capture('paywall_viewed', {
      source: paywallSource,
      paywall_variant: 'offering',
    });
  }, [paywallSource, posthog]);

  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
          const nextOffering = offerings.all?.Offer ?? null;
          setPromoOffering(nextOffering);
        }
      } catch (error) {
        console.error('Error fetching offerings', error);
      }
    };

    void fetchOfferings();
  }, [paywallSource, posthog]);

  if (isPro) {
    return <Redirect href={HOME_ROUTE} />;
  }

  return (
    <View style={{ flex: 1 }}>
      {promoOffering ? (
        <RevenueCatUI.Paywall
          options={{
            offering: promoOffering,
          }}
          onDismiss={() => {
            posthog?.capture('paywall_dismissed', {
              source: paywallSource,
              paywall_variant: 'offering',
            });
            router.replace(HOME_ROUTE);
          }}
          onPurchaseCompleted={async ({ storeTransaction }) => {
            if (storeTransaction?.productIdentifier && storeTransaction?.transactionIdentifier) {
              addCredits(storeTransaction.productIdentifier, storeTransaction.transactionIdentifier);
            } else {
              console.warn('Missing store transaction in offering paywall purchase callback; skipping credit grant.');
            }

            posthog?.capture('paywall_purchase_completed', {
              source: paywallSource,
              paywall_variant: 'offering',
              product_identifier: storeTransaction?.productIdentifier ?? null,
              transaction_identifier: storeTransaction?.transactionIdentifier ?? null,
            });
            router.replace(HOME_ROUTE);
          }}
          onRestoreCompleted={async () => {
            posthog?.capture('paywall_restore_completed', {
              source: paywallSource,
              paywall_variant: 'offering',
            });
            router.replace(HOME_ROUTE);
          }}
        />
      ) : (
        <ActivityIndicator
          size="large"
          color="#14b8a6"
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        />
      )}
    </View>
  );
}
