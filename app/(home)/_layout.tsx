import { theme } from '@/constants/theme'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { Stack, useRouter } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
export default function HomeLayout() {
    const router = useRouter()
    const { t } = useTranslation()
    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerTransparent:isLiquidGlassAvailable(),
                    headerStyle:{backgroundColor:isLiquidGlassAvailable()?'transparent':undefined,},
                    headerShown: true,
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
