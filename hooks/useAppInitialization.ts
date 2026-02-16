import { useDbStore } from '@/stores/dbStore';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { OneSignal } from 'react-native-onesignal';
import Purchases from 'react-native-purchases';

const rc_apple_api_key = process.env.EXPO_PUBLIC_RC_APPLE_API_KEY || '';
// Support both env names to avoid silent misconfiguration during migration.
const onesignal_app_id =
    process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
    process.env.EXPO_PUBLIC_ONESIGNAL_API_KEY ||
    '';

// Keep the splash screen visible while we load critical resources.
SplashScreen.setOptions({ duration: 600, fade: true });
SplashScreen.preventAutoHideAsync().catch(() => {});

export function useAppInitialization() {
    const [isReady, setIsReady] = useState(false);
    const { initializeDb } = useDbStore();

    useEffect(() => {
        let userObserver: any | null = null;
        let cancelled = false;

        const configurePurchases = async () => {
            if (rc_apple_api_key) {
                if (Platform.OS === 'ios') {
                    Purchases.configure({ apiKey: rc_apple_api_key });
                    const configured = await Purchases.isConfigured();
                    if (configured) {
                        await Purchases.enableAdServicesAttributionTokenCollection();
                    }
                }
            } else {
                console.warn('RevenueCat API key is missing. Analytics and purchases will be disabled.');
            }
        };

        const initOneSignal = async () => {
            if (onesignal_app_id) {
                OneSignal.initialize(onesignal_app_id);
            }
        };


        const syncIdsToRevenueCat = async () => {
            try {
                const onesignalId = await OneSignal.User.getOnesignalId();
                if (onesignalId) {
                    await Purchases.setAttributes({ $onesignalUserId: onesignalId });
                    await Purchases.syncAttributesAndOfferingsIfNeeded?.();
                }
            } catch (e) {
                console.warn('Initial OneSignal -> RevenueCat sync failed', e);
            }
        };

        const attachObserver = () => {
            userObserver = OneSignal.User.addEventListener('change', async (user) => {
                try {
                    const onesignalId = user.current?.onesignalId;
                    if (onesignalId) {
                        await Purchases.setAttributes({ $onesignalUserId: onesignalId });
                        await Purchases.syncAttributesAndOfferingsIfNeeded?.();
                    }
                } catch (e) {
                    console.warn('OneSignal -> RevenueCat sync failed', e);
                }
            });
        };

        (async () => {
            try {
                await initializeDb();
                await configurePurchases();
                await initOneSignal();
                await syncIdsToRevenueCat();
                attachObserver();
            } catch (e) {
                console.warn('App initialization failed', e);
            } finally {
                if (!cancelled) {
                    setIsReady(true);
                }
            }
        })();

        return () => {
            cancelled = true;
            if (userObserver) {
                OneSignal.User.removeEventListener?.('change', userObserver);
            }
        };
    }, [initializeDb]);

    useEffect(() => {
        if (isReady) {
            SplashScreen.hideAsync().catch(() => {});
        }
    }, [isReady]);

    return { isReady };
}
