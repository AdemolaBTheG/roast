import { theme } from '@/constants/theme'
import { useSubscription } from '@/context/SubscriptionContext'
import { useCreditStore } from '@/stores/creditStore'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { Stack, useRouter } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'

export default function HomeLayout() {
    const router = useRouter()
    const { t } = useTranslation()
    const { isPro } = useSubscription()
    const credits = useCreditStore((s) => s.credits)

    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerTransparent:isLiquidGlassAvailable(),
                    headerStyle:{backgroundColor:isLiquidGlassAvailable()?'transparent':undefined,},
                    headerShown: true,
                    headerTitle: t('navigation.roast'),
                    unstable_headerLeftItems: () => [
                        {
                            type: 'button',
                            label: t('navigation.settings'),
                            tintColor: theme.colors.primary,
                            icon: { type: 'sfSymbol', name: 'gearshape' },
                            onPress: () => router.push('/(settings)'),
                        },
                    ],
                    unstable_headerRightItems: () => [
                        {
                            type: 'button',
                            label: isPro ? t('credits.unlimited') : t('credits.roastsCount', { count: credits }),
                            tintColor: theme.colors.primary,
                            onPress: () => router.push('/(paywalls)'),
                        },
                        {
                            type: 'button',
                            label: t('navigation.add'),
                            variant: 'prominent',
                            tintColor: theme.colors.primary,
                            icon: { type: 'sfSymbol', name: 'plus' },
                            onPress: () => router.push('/(add)'),
                        },
                    ],
                }}
            />
        </Stack>
    )
}
