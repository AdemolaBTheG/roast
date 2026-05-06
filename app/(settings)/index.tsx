import { AppTheme } from '@/constants/Theme'
import {
  SUPPORTED_LANGUAGES,
  getCurrentAppLanguage,
  setAppLanguage,
  type AppLanguage,
} from '@/i18n'
import { clearRoastHistory } from '@/services/roast-db'
import { useCreditStore } from '@/stores/creditStore'
import { useDbStore } from '@/stores/dbStore'
import {
  DropdownMenu as AndroidDropdownMenu,
  DropdownMenuItem as AndroidDropdownMenuItem,
  FilledTonalButton as AndroidFilledTonalButton,
  Text as AndroidText,
} from '@expo/ui/jetpack-compose'
import { Host, Text as IOSText, Picker } from '@expo/ui/swift-ui'
import { frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers'
import { Ionicons } from '@expo/vector-icons'
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia'
import { useQueryClient } from '@tanstack/react-query'
import * as Burnt from 'burnt'
import * as Haptics from 'expo-haptics'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { usePostHog } from 'posthog-react-native'
import { PressableScale } from 'pressto'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Platform, SectionList, Text, View } from 'react-native'
import RevenueCatUI from 'react-native-purchases-ui'
import { Easing, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'

const TERMS_URL = 'https://ajar-prune-18d.notion.site/Roast-App-Terms-Of-Service-30799fdd69fc804280bfd3137654cb1e?pvs=73'
const PRIVACY_URL = 'https://ajar-prune-18d.notion.site/Roast-App-Privacy-Policy-30799fdd69fc80d6841dd5a8f142508b?pvs=73'
const SUPPORT_EMAIL = 'hahaderbre@gmail.com'
const ituneItemsId = "6759192087";

type SettingsRow = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  onPress?: () => void | Promise<void>
  value?: string
  destructive?: boolean
  external?: boolean
  rowType?: 'button' | 'language-picker'
}

type SettingsSection = {
  title: string
  data: SettingsRow[]
}

export default function SettingsScreen() {
  const { db } = useDbStore()
  const queryClient = useQueryClient()
  const posthog = usePostHog()
  const credits = useCreditStore((s) => s.credits)
  const { t } = useTranslation()
  const [cardSize, setCardSize] = React.useState({ width: 0, height: 0 })
  const [currentLanguage, setCurrentLanguage] = React.useState<AppLanguage>(getCurrentAppLanguage())
  const [isLanguageMenuExpanded, setIsLanguageMenuExpanded] = React.useState(false)
  const isIOS = Platform.OS === 'ios'

  React.useEffect(() => {
    posthog?.capture('screen_viewed', {
      screen_name: 'settings',
    })
  }, [posthog])

  const openLink = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url)
    if (!canOpen) {
      Burnt.toast({
        title: t('settings.alerts.cannotOpenLinkTitle'),
        message: url,
        preset: 'error',
        haptic: 'error',
      })
      return
    }
    await Linking.openURL(url)
  }

  const handleBuyCredits = () => {
    router.push('/(paywalls)')
  }

  const handleRateApp = async () => {
    Linking.openURL(
        `itms-apps://itunes.apple.com/app/viewContentsUserReviews/id${ituneItemsId}?action=write-review`
      );

  }

  const handleContactSupport = async () => {
    await RevenueCatUI.presentCustomerCenter();
  }

  const handleClearHistory = () => {
    Alert.alert(
      t('settings.alerts.clearHistoryTitle'),
      t('settings.alerts.clearHistoryBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            if (!db) return
            void (async () => {
              try {
                await clearRoastHistory(db)
                await queryClient.invalidateQueries({ queryKey: ['roast-history'] })
                await queryClient.invalidateQueries({ queryKey: ['roast-item'] })
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                Burnt.toast({
                  title: t('settings.alerts.clearHistoryTitle'),
                  preset: 'done',
                  haptic: 'success',
                })
              } catch {
                Burnt.toast({
                  title: t('settings.alerts.clearHistoryErrorTitle'),
                  message: t('settings.alerts.clearHistoryErrorBody'),
                  preset: 'error',
                  haptic: 'error',
                })
              }
            })()
          },
        },
      ]
    )
  }

  const handleLanguageChange = async (nextLanguage: AppLanguage) => {
    if (nextLanguage === currentLanguage) return
    await Haptics.selectionAsync()
    await setAppLanguage(nextLanguage)
    setCurrentLanguage(nextLanguage)
    posthog?.capture('settings_language_changed', {
      from_language: currentLanguage,
      to_language: nextLanguage,
    })
  }

  const sections: SettingsSection[] = [
    {
      title: t('settings.sections.language'),
      data: [
        {
          id: 'language-picker',
          label: t('settings.sections.language'),
          icon: 'language',
          rowType: 'language-picker',
        },
      ],
    },
    {
      title: t('settings.sections.data'),
      data: [
        {
          id: 'clear-history',
          label: t('settings.rows.clearHistory'),
          icon: 'trash',
          destructive: true,
          onPress: handleClearHistory,
        },
      ],
    },
    {
      title: t('settings.sections.support'),
      data: [
        {
          id: 'rate-app',
          label: t('settings.rows.rateApp'),
          icon: 'star',
          onPress: handleRateApp,
        },
        {
          id: 'contact',
          label: t('settings.rows.contactSupport'),
          icon: 'mail',
          onPress: handleContactSupport,
        },
      ],
    },
    {
      title: t('settings.sections.legal'),
      data: [
        {
          id: 'terms',
          label: t('settings.rows.terms'),
          icon: 'document-text',
          external: true,
          onPress: () => openLink(TERMS_URL),
        },
        {
          id: 'privacy',
          label: t('settings.rows.privacy'),
          icon: 'shield-checkmark',
          external: true,
          onPress: () => openLink(PRIVACY_URL),
        },
      ],
    },
  ]

  const onRowPress = async (item: SettingsRow) => {
    if (!item.onPress) return
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await item.onPress()
  }

  return (

      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        stickySectionHeadersEnabled={false}
        keyExtractor={(item) => item.id}
        sections={sections}
        contentContainerStyle={{
          paddingHorizontal: AppTheme.spacing.md,
          paddingBottom: AppTheme.spacing.xxl,
        }}
        ListHeaderComponent={
          <PressableScale
            onPress={handleBuyCredits}
            style={{
              marginTop: AppTheme.spacing.sm,
              marginBottom: AppTheme.spacing.sm,
            }}
          >
            <View
              onLayout={(event) => {
                const next = event.nativeEvent.layout
                if (next.width !== cardSize.width || next.height !== cardSize.height) {
                  setCardSize({ width: next.width, height: next.height })
                }
              }}
              style={{
                position: 'relative',
                borderRadius: AppTheme.borderRadius.xl,
                borderCurve: 'continuous',
                overflow: 'hidden',
                padding: AppTheme.spacing.lg,
                backgroundColor: AppTheme.colors.primary,
                boxShadow: '0px 14px 28px rgba(234, 88, 12, 0.28)',
                gap: AppTheme.spacing.xs,
              }}
            >
              {cardSize.width > 0 && cardSize.height > 0 ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                  }}
                >
                  <AnimatedGradientRect
                    width={cardSize.width}
                    height={cardSize.height}
                  />
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: AppTheme.spacing.sm }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(255,255,255,0.22)',
                    }}
                  >
                    <Ionicons name="flame" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
                    {t('settings.creditsCard.title')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.92)" />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                {t('settings.creditsCard.subtitle', { count: credits })}
              </Text>
            </View>
          </PressableScale>
        }
        renderSectionHeader={({ section }) => (
          <Text
            style={{
              marginTop: AppTheme.spacing.lg,
              marginBottom: AppTheme.spacing.sm,
              marginLeft: AppTheme.spacing.xs,
              fontSize: 12,
              letterSpacing: 0.5,
              fontWeight: '700',
              color: AppTheme.colors.text.secondary,
              textTransform: 'uppercase',
            }}
          >
            {section.title}
          </Text>
        )}
        renderItem={({ item, index, section }) => {
          const isLast = index === section.data.length - 1
          const iconTint = item.destructive ? AppTheme.colors.danger : AppTheme.colors.primary
          const iconBg = item.destructive ? 'rgba(239, 68, 68, 0.12)' : 'rgba(234, 88, 12, 0.12)'

          if (item.rowType === 'language-picker') {
            return (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderTopLeftRadius: index === 0 ? AppTheme.borderRadius.lg : 0,
                  borderTopRightRadius: index === 0 ? AppTheme.borderRadius.lg : 0,
                  borderBottomLeftRadius: isLast ? AppTheme.borderRadius.lg : 0,
                  borderBottomRightRadius: isLast ? AppTheme.borderRadius.lg : 0,
                  borderCurve: 'continuous',
                }}
              >
                <View
                  style={{
                    minHeight: 58,
                    paddingHorizontal: AppTheme.spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: AppTheme.spacing.sm }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        borderCurve: 'continuous',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: iconBg,
                      }}
                    >
                      <Ionicons name={item.icon} size={18} color={iconTint} />
                    </View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '500',
                        color: AppTheme.colors.text.primary,
                      }}
                    >
                      {item.label}
                    </Text>
                  </View>

                  {isIOS ? (
                    <Host matchContents useViewportSizeMeasurement style={{ alignItems: 'flex-end' }}>
                      <Picker<AppLanguage>
                        modifiers={[pickerStyle('menu'), frame({ width: 170 })]}
                        selection={currentLanguage}
                        onSelectionChange={(selection) => {
                          void handleLanguageChange(selection)
                        }}
                      >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <IOSText key={lang} modifiers={[tag(lang)]}>
                            {t(`languages.${lang}`)}
                          </IOSText>
                        ))}
                      </Picker>
                    </Host>
                  ) : (
                    <AndroidDropdownMenu
                      expanded={isLanguageMenuExpanded}
                      onDismissRequest={() => setIsLanguageMenuExpanded(false)}
                    >
                      <AndroidDropdownMenu.Trigger>
                        <AndroidFilledTonalButton
                          onClick={() => setIsLanguageMenuExpanded((value) => !value)}
                          colors={{
                            containerColor: 'rgba(234, 88, 12, 0.12)',
                            contentColor: AppTheme.colors.primary,
                          }}
                        >
                          {t(`languages.${currentLanguage}`)}
                        </AndroidFilledTonalButton>
                      </AndroidDropdownMenu.Trigger>
                      <AndroidDropdownMenu.Items>
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <AndroidDropdownMenuItem
                            key={lang}
                            onClick={() => {
                              setIsLanguageMenuExpanded(false)
                              void handleLanguageChange(lang)
                            }}
                          >
                            <AndroidDropdownMenuItem.Text>
                              <AndroidText>{t(`languages.${lang}`)}</AndroidText>
                            </AndroidDropdownMenuItem.Text>
                          </AndroidDropdownMenuItem>
                        ))}
                      </AndroidDropdownMenu.Items>
                    </AndroidDropdownMenu>
                  )}
                </View>
              </View>
            )
          }

          return (
            <PressableScale
              onPress={() => {
                void onRowPress(item)
              }}
              style={{
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: index === 0 ? AppTheme.borderRadius.lg : 0,
                borderTopRightRadius: index === 0 ? AppTheme.borderRadius.lg : 0,
                borderBottomLeftRadius: isLast ? AppTheme.borderRadius.lg : 0,
                borderBottomRightRadius: isLast ? AppTheme.borderRadius.lg : 0,
                borderCurve: 'continuous',
              }}
            >
              <View
                style={{
                  minHeight: 58,
                  paddingHorizontal: AppTheme.spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: AppTheme.spacing.sm }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      borderCurve: 'continuous',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: iconBg,
                    }}
                  >
                    <Ionicons name={item.icon} size={18} color={iconTint} />
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: item.destructive ? AppTheme.colors.danger : AppTheme.colors.text.primary,
                    }}
                  >
                    {item.label}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {item.value ? (
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: AppTheme.colors.text.secondary,
                      }}
                    >
                      {item.value}
                    </Text>
                  ) : null}
                  <Ionicons
                    name={item.external ? 'open-outline' : 'chevron-forward'}
                    size={18}
                    color={AppTheme.colors.text.secondary}
                  />
                </View>
              </View>

              {!isLast ? (
                <View
                  style={{
                    height: 1,
                    marginLeft: 56,
                    backgroundColor: AppTheme.colors.divider,
                  }}
                />
              ) : null}
            </PressableScale>
          )
        }}
      />
  )
}

function AnimatedGradientRect({ width, height }: { width: number; height: number }) {
  const progress = useSharedValue(0)

  React.useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 5200,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    )
  }, [progress])

  const start = useDerivedValue(() => {
    'worklet'
    const angle = progress.value * Math.PI * 2
    const radius = width * 0.11
    const centerX = width * 0.25
    const centerY = height * 0.25
    return vec(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
  })

  const end = useDerivedValue(() => {
    'worklet'
    const angle = progress.value * Math.PI * 2 + Math.PI
    const radius = width * 0.18
    const centerX = width * 0.75
    const centerY = height * 0.75
    return vec(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
  })

  return (
    <Canvas style={{ flex: 1 }}>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={start}
          end={end}
          colors={['#9A3412', AppTheme.colors.primary, '#FB923C']}
          positions={[0, 0.55, 1]}
        />
      </Rect>
    </Canvas>
  )
}
