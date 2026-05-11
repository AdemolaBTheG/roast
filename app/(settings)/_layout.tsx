import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { Stack, useRouter } from 'expo-router'
import { AppTheme } from '@/constants/Theme'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { Platform, Pressable } from 'react-native'

export default function SettingsLayout() {
    const router = useRouter()
    const { t } = useTranslation()
    const isAndroid = Platform.OS === 'android'

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
                        backgroundColor: isLiquidGlassAvailable() ? 'transparent' : '#f2f2f2',
                    },
                    headerLeft: isAndroid
                        ? () => (
                              <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={t('navigation.back')}
                                  hitSlop={10}
                                  onPress={() => {
                                      if (router.canGoBack()) {
                                          router.back()
                                          return
                                      }
                                      router.replace('/(home)')
                                  }}
                                  style={{ paddingVertical: 6, paddingRight: 10 }}
                              >
                                  <Ionicons
                                      name="chevron-back"
                                      size={24}
                                      color={AppTheme.colors.primary}
                                  />
                              </Pressable>
                          )
                        : undefined,
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
