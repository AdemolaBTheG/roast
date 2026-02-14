import { AppTheme } from '@/constants/theme'
import { useSubscription } from '@/context/SubscriptionContext'
import {
  SUPPORTED_LANGUAGES,
  getCurrentAppLanguage,
  setAppLanguage,
  type AppLanguage,
} from '@/i18n'
import { clearRoastHistory } from '@/services/roast-db'
import { useDbStore } from '@/stores/dbStore'
import { Ionicons } from '@expo/vector-icons'
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia'
import { useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import * as StoreReview from 'expo-store-review'
import { PressableScale } from 'pressto'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, SectionList, Text, View } from 'react-native'
import RevenueCatUI from 'react-native-purchases-ui'
import { Easing, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'

const TERMS_URL = 'https://www.brainnotes.app/terms'
const PRIVACY_URL = 'https://www.brainnotes.app/privacy'
const SUPPORT_EMAIL = 'support@brainnotes.app'

type SettingsRow = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void | Promise<void>
  value?: string
  destructive?: boolean
  external?: boolean
}

type SettingsSection = {
  title: string
  data: SettingsRow[]
}

export default function SettingsScreen() {
  const { db } = useDbStore()
  const queryClient = useQueryClient()
  const { isPro } = useSubscription()
  const { t } = useTranslation()
  const [proCardSize, setProCardSize] = React.useState({ width: 0, height: 0 })
  const [currentLanguage, setCurrentLanguage] = React.useState<AppLanguage>(getCurrentAppLanguage())

  const openLink = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url)
    if (!canOpen) {
      Alert.alert(t('settings.alerts.cannotOpenLinkTitle'), url)
      return
    }
    await Linking.openURL(url)
  }

  const handleManageSubscription = async () => {
    if (!isPro) {
      router.push('/(paywalls)')
      return
    }

    try {
      await RevenueCatUI.presentCustomerCenter()
    } catch {
      Alert.alert(t('settings.alerts.unavailableTitle'), t('settings.alerts.unavailableBody'))
    }
  }

  const handleRateApp = async () => {
    const canReview = await StoreReview.hasAction()
    if (canReview) {
      await StoreReview.requestReview()
      return
    }

    await openLink('https://www.brainnotes.app')
  }

  const handleContactSupport = async () => {
    await openLink(`mailto:${SUPPORT_EMAIL}?subject=Brainnotes%20Support`)
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
              } catch {
                Alert.alert(
                  t('settings.alerts.clearHistoryErrorTitle'),
                  t('settings.alerts.clearHistoryErrorBody')
                )
              }
            })()
          },
        },
      ]
    )
  }

  const handleLanguageChange = async (nextLanguage: AppLanguage) => {
    if (nextLanguage === currentLanguage) return
    await setAppLanguage(nextLanguage)
    setCurrentLanguage(nextLanguage)
  }

  const sections: SettingsSection[] = [
    {
      title: t('settings.sections.account'),
      data: [
        {
          id: 'subscription',
          label: isPro ? t('settings.rows.manageSubscription') : t('settings.rows.upgradeToPro'),
          icon: isPro ? 'sparkles' : 'diamond',
          value: isPro ? t('common.pro') : t('common.free'),
          onPress: handleManageSubscription,
        },
      ],
    },
    {
      title: t('settings.sections.language'),
      data: SUPPORTED_LANGUAGES.map((lang) => ({
        id: `language-${lang}`,
        label: t(`languages.${lang}`),
        icon: 'language',
        value: currentLanguage === lang ? t('common.selected') : undefined,
        onPress: () => handleLanguageChange(lang),
      })),
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
          !isPro ? (
            <PressableScale
              onPress={() => {
                void onRowPress({
                  id: 'upgrade-card',
                  label: t('settings.rows.upgradeToPro'),
                  icon: 'sparkles',
                  onPress: handleManageSubscription,
                })
              }}
              style={{
                marginTop: AppTheme.spacing.sm,
                marginBottom: AppTheme.spacing.sm,
              }}
            >
              <View
                onLayout={(event) => {
                  const next = event.nativeEvent.layout
                  if (next.width !== proCardSize.width || next.height !== proCardSize.height) {
                    setProCardSize({ width: next.width, height: next.height })
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
                {proCardSize.width > 0 && proCardSize.height > 0 ? (
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
                      width={proCardSize.width}
                      height={proCardSize.height}
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
                      <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    </View>
                    <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
                      {t('settings.proCard.title')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.92)" />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                  {t('settings.proCard.subtitle')}
                </Text>
              </View>
            </PressableScale>
          ) : null
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
