import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { Stack, useRouter } from 'expo-router'
import { AppTheme } from '@/constants/theme'
import { useTranslation } from 'react-i18next'

export default function SettingsLayout() {
    const router = useRouter()
    const { t } = useTranslation()

    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerShown: true,
                    title: t('navigation.settings'),
                    headerLargeTitleEnabled: true,
                    headerTransparent: isLiquidGlassAvailable(),
                    headerStyle: {
                        backgroundColor: isLiquidGlassAvailable() ? 'transparent' : undefined,
                    },
                    unstable_headerLeftItems: () => [
                        {
                            type: 'button',
                            label: t('navigation.back'),
                            tintColor: AppTheme.colors.primary,
                            icon: { type: 'sfSymbol', name: 'chevron.backward' },
                            onPress: () => {
                                if (router.canGoBack()) {
                                    router.back()
                                    return
                                }
                                router.replace('/(home)')
                            },
                        },
                    ],
                }}
            />
        </Stack>
    )
}
