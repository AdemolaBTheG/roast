import { useCreditStore } from '@/stores/creditStore';
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';

export default function Paywall() {
    const addCredits = useCreditStore((s) => s.addCredits);

    return (
        <View style={{ flex: 1 }}>
            <RevenueCatUI.Paywall
                onDismiss={() => {
                    if (router.canGoBack()) {
                        router.back();
                    } else {
                        router.replace('/(home)');
                    }
                }}
                onPurchaseCompleted={({ storeTransaction }) => {
                    // Grant credits for the purchased consumable
                    if (storeTransaction) {
                        addCredits(
                            storeTransaction.productIdentifier,
                            storeTransaction.transactionIdentifier
                        );
                    }

                  
                        router.replace('/(home)');
                
                }}
            />
        </View>
    );
}
