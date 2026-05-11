import { theme } from '@/constants/Theme'
import { useSubscription } from '@/context/SubscriptionContext'
import { useCreditStore } from '@/stores/creditStore'
import { Ionicons } from '@expo/vector-icons'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { Stack, useRouter } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, Pressable, Text, View } from 'react-native'

export default function HomeLayout() {
    const router = useRouter()
    const { t } = useTranslation()
    const { isPro } = useSubscription()
    const credits = useCreditStore((s) => s.credits)
    const isAndroid = Platform.OS === 'android'

    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerTransparent:isLiquidGlassAvailable(),
                    headerStyle:{backgroundColor:isLiquidGlassAvailable()?'transparent':'#f2f2f2',},
                    headerShown: true,
                    headerTitle: t('navigation.roast'),
                    headerLeft: isAndroid
                        ? () => (
                              <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={t('navigation.settings')}
                                  hitSlop={10}
                                  onPress={() => router.push('/(settings)')}
                                  style={{ paddingVertical: 6, paddingRight: 10 }}
                              >
                                  <Ionicons name="settings-outline" size={22} color={theme.colors.primary} />
                              </Pressable>
                          )
                        : undefined,
                    headerRight: isAndroid
                        ? () => (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                  <Pressable
                                      accessibilityRole="button"
                                      accessibilityLabel={isPro ? t('credits.unlimited') : t('credits.roastsCount', { count: credits })}
                                      hitSlop={10}
                                      onPress={() => router.push('/(paywalls)')}
                                      style={{
                                          paddingHorizontal: 10,
                                          paddingVertical: 6,
                                          borderRadius: 999,
                                          backgroundColor: 'rgba(234, 88, 12, 0.12)',
                                      }}
                                  >
                                      <Text
                                          style={{
                                              color: theme.colors.primary,
                                              fontSize: 13,
                                              fontWeight: '700',
                                          }}
                                      >
                                          {isPro ? t('credits.unlimited') : t('credits.roastsCount', { count: credits })}
                                      </Text>
                                  </Pressable>
                                  <Pressable
                                      accessibilityRole="button"
                                      accessibilityLabel={t('navigation.add')}
                                      hitSlop={10}
                                      onPress={() => router.push('/(add)')}
                                      style={{ paddingVertical: 6, paddingLeft: 2 }}
                                  >
                                      <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
                                  </Pressable>
                              </View>
                          )
                        : undefined,
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
