import { HStack, Host, Button as IOSButton } from '@expo/ui/swift-ui'
import {
  buttonStyle,
  controlSize,
  disabled,
  frame,
  labelStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { ImageFormat, makeImageFromView } from '@shopify/react-native-skia'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Burnt from 'burnt'
import * as Clipboard from 'expo-clipboard'
import * as FileSystem from 'expo-file-system/legacy'
import {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
  selectionAsync,
} from 'expo-haptics'
import { Image } from 'expo-image'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { usePostHog } from 'posthog-react-native'
import * as Sharing from 'expo-sharing'
import { PressableScale } from 'pressto'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  Share,
  Text,
  View,
  useWindowDimensions
} from 'react-native'
import { Confetti } from 'react-native-fast-confetti'
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppTheme } from '@/constants/Theme'
import { useSubscription } from '@/context/SubscriptionContext'
import {
  deleteRoastById,
  getRoastById,
  setRoastVariantFavorite,
  updateRoastSelectedVariantIndex,
  type RoastWithVariants,
} from '@/services/roast-db'
import { useCreditStore } from '@/stores/creditStore'
import { useDbStore } from '@/stores/dbStore'

// --- HELPER FUNCTIONS ---

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function parseRoastId(value: string | string[] | undefined): number | null {
  if (!value) return null
  const strVal = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(strVal, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getBurnMeta(burnLevel: number, t: (key: string) => string) {
  if (burnLevel <= 30) {
    return { color: '#9CA3AF', label: t('item.labels.playful'), fillPercent: 32 }
  }
  if (burnLevel <= 70) {
    return { color: '#F59E0B', label: t('item.labels.savage'), fillPercent: 66 }
  }
  return {
    color: AppTheme.colors.secondary,
    label: t('item.labels.unhinged'),
    fillPercent: 100,
  }
}

function getAudienceLabel(audience: string, t: (key: string) => string) {
  switch (audience) {
    case 'Bestie':
    case 'Friend':
      return t('add.audiences.bestie')
    case 'Sibling':
    case 'Family':
      return t('add.audiences.sibling')
    case 'Ex':
    case 'Partner':
      return t('add.audiences.ex')
    case 'Coworker':
    case 'Work':
      return t('add.audiences.coworker')
    case 'Self':
      return t('add.audiences.self')
    case 'Stranger':
    case 'General':
      return t('add.audiences.stranger')
    default:
      return audience
  }
}

function getRoastFontSize(content: string) {
  const length = content.trim().length
  if (length <= 40) return 24
  if (length <= 80) return 20
  if (length <= 140) return 18
  return 16
}

type VariantSlideProps = {
  content: string
  index: number
  pageWidth: number
  scrollX: SharedValue<number>
}

function VariantSlide({ content, index, pageWidth, scrollX }: VariantSlideProps) {
  const fontSize = getRoastFontSize(content)
  const animatedTextStyle = useAnimatedStyle(() => {
    const page = scrollX.value / Math.max(pageWidth, 1)
    const distance = Math.abs(page - index)

    return {
      opacity: interpolate(distance, [0, 1], [1, 0.35], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(distance, [0, 1], [1, 0.92], Extrapolation.CLAMP) },
        { translateY: interpolate(distance, [0, 1], [0, 8], Extrapolation.CLAMP) },
      ],
    }
  })

  return (
    <View
      style={{
        width: pageWidth,
        paddingHorizontal: 24,
        paddingTop: 2,
        paddingBottom: 8,
      }}
    >
      <Animated.Text
        selectable
        suppressHighlighting
        style={[
          {
            fontSize,
            fontWeight: '700',
            color: '#1A1A1A',
            lineHeight: fontSize * 1.3,
            textAlign: 'left',
          },
          animatedTextStyle,
        ]}
      >
        {content}
      </Animated.Text>
    </View>
  )
}

type VariantDotProps = {
  index: number
  pageWidth: number
  scrollX: SharedValue<number>
}
type VariantItem = RoastWithVariants['variants'][number]

function VariantDot({ index, pageWidth, scrollX }: VariantDotProps) {
  const animatedDotStyle = useAnimatedStyle(() => {
    const page = scrollX.value / Math.max(pageWidth, 1)
    const distance = Math.abs(page - index)

    return {
      opacity: interpolate(distance, [0, 1], [1, 0.35], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(distance, [0, 1], [1.2, 1], Extrapolation.CLAMP) }],
    }
  })

  return (
    <Animated.View
      style={[
        {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: AppTheme.colors.primary,
        },
        animatedDotStyle,
      ]}
    />
  )
}

// --- MAIN COMPONENT ---

export default function RoastItemScreen() {
  const navigation = useNavigation()
  const queryClient = useQueryClient()
  const { db } = useDbStore()
  const { t } = useTranslation()
  const posthog = usePostHog()
  const { isPro } = useSubscription()
  const hasClaimedShareBonus = useCreditStore((state) => state.hasClaimedShareBonus)
  const params = useLocalSearchParams<{ id?: string; celebrate?: string }>()
  const roastId = parseRoastId(params.id)
  
  // State
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfetti, setShowConfetti] = useState(params.celebrate === '1')
  
  // Refs
  const cardRef = useRef<View>(null)
  const variantPagerRef = useRef<FlatList<VariantItem>>(null)
  const variantScrollX = useSharedValue(0)
  const favoriteFlags = useSharedValue<number[]>([])
  
  // Layout
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const horizontalPadding = AppTheme.spacing.md
  const iosMajorVersion =
    Platform.OS === 'ios'
      ? Number.parseInt(String(Platform.Version).split('.')[0] ?? '0', 10) || 0
      : 0
  const isIOS26OrNewer = Platform.OS === 'ios' && iosMajorVersion >= 26
  
  // "Polaroid" Card Dimensions
  const cardWidth = Math.min(width - horizontalPadding * 2, 400)
  const cardImageHeight = cardWidth * 1 // Square image looks best for polaroid style
  
  const roastQueryKey = useMemo(() => ['roast-item', roastId] as const, [roastId])

  // --- DATA FETCHING ---
  const {
    data: roast,
    isLoading,
    refetch,
  } = useQuery<RoastWithVariants | null>({
    queryKey: roastQueryKey,
    queryFn: async () => {
      if (!db || !roastId) return null
      return getRoastById(db, roastId)
    },
    enabled: Boolean(db) && Boolean(roastId),
  })

  const variants = useMemo(() => roast?.variants ?? [], [roast?.variants])
  const maxVariantIndex = Math.max(0, variants.length - 1)
  const currentVariant = variants[currentIndex] ?? null
  const burnMeta = getBurnMeta(roast?.burnLevel ?? 0, t)
  const audienceLabel = roast ? getAudienceLabel(roast.audience, t) : ''
  const showShareBonusBadge = !isPro && !hasClaimedShareBonus

  useEffect(() => {
    if (!roast) return

    posthog?.capture('screen_viewed', {
      screen_name: 'item',
      roast_id: roast.id,
      audience: roast.audience,
      input_type: roast.inputType,
      variant_count: variants.length,
      burn_level: roast.burnLevel,
    })
  }, [posthog, roast, variants.length])

  useEffect(() => {
    favoriteFlags.value = variants.map((variant) => (variant.isFavorite ? 1 : 0))
  }, [favoriteFlags, variants])

  const favoriteProgress = useDerivedValue(() => {
    'worklet'
    const flags = favoriteFlags.value
    if (flags.length === 0) return 0

    const safeWidth = Math.max(cardWidth, 1)
    const rawPage = variantScrollX.value / safeWidth
    const maxIndex = flags.length - 1
    const page = Math.min(maxIndex, Math.max(0, rawPage))
    const leftIndex = Math.floor(page)
    const rightIndex = Math.min(maxIndex, Math.ceil(page))
    const mix = page - leftIndex
    const leftValue = flags[leftIndex] ?? 0
    const rightValue = flags[rightIndex] ?? leftValue

    return leftValue + (rightValue - leftValue) * mix
  })

  const favoriteButtonAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      favoriteProgress.value,
      [0, 1],
      ['#F3F4F6', '#FFE9DC']
    ),
    borderColor: interpolateColor(
      favoriteProgress.value,
      [0, 1],
      ['#E5E7EB', AppTheme.colors.primary]
    ),
    transform: [
      {
        scale: interpolate(favoriteProgress.value, [0, 1], [1, 1.06], Extrapolation.CLAMP),
      },
    ],
  }))

  const favoriteFilledIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: favoriteProgress.value,
    transform: [
      {
        scale: interpolate(favoriteProgress.value, [0, 1], [0.9, 1], Extrapolation.CLAMP),
      },
    ],
  }))

  const favoriteOutlineIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - favoriteProgress.value,
    transform: [
      {
        scale: interpolate(favoriteProgress.value, [0, 1], [1, 0.94], Extrapolation.CLAMP),
      },
    ],
  }))

  // --- EFFECT: SYNC INDEX ---
  useEffect(() => {
    if (roast?.selectedVariantIndex !== undefined) {
      setCurrentIndex(clamp(roast.selectedVariantIndex, 0, maxVariantIndex))
    }
  }, [maxVariantIndex, roast?.selectedVariantIndex])

  // --- EFFECT: SCROLL TO INDEX ---
  useEffect(() => {
    if (variantPagerRef.current) {
      variantPagerRef.current.scrollToOffset({
        offset: currentIndex * cardWidth,
        animated: false,
      })
      variantScrollX.value = currentIndex * cardWidth
    }
  }, [currentIndex, cardWidth, variantScrollX])

  // --- HANDLERS ---

  const persistSelectedVariant = useCallback(
    (nextIndex: number) => {
      if (!db || !roast) return

      queryClient.setQueryData<RoastWithVariants | null>(roastQueryKey, (prev) => {
        if (!prev) return prev
        return { ...prev, selectedVariantIndex: nextIndex }
      })

      void updateRoastSelectedVariantIndex(db, roast.id, nextIndex)
    },
    [db, queryClient, roast, roastQueryKey]
  )

  const handleVariantMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const rawIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth)
      const clampedIndex = clamp(rawIndex, 0, maxVariantIndex)
      
      setCurrentIndex(clampedIndex)
      if (clampedIndex !== roast?.selectedVariantIndex) {
        persistSelectedVariant(clampedIndex)
      }
    },
    [cardWidth, maxVariantIndex, persistSelectedVariant, roast]
  )

  const variantScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      variantScrollX.value = event.contentOffset.x
    },
  })

  const handleSharePress = useCallback(async () => {
    if (isDeleting) return

    if (Platform.OS === 'ios') {
      void impactAsync(ImpactFeedbackStyle.Medium)
    }

    try {
      // 1. Snapshot the view using Skia
      const snapshot = await makeImageFromView(cardRef)
      if (!snapshot) return

      // 2. Encode to Base64 PNG
      const base64Data = snapshot.encodeToBase64(ImageFormat.PNG, 100)
      
      // 3. Write to cache
      const filename = `${FileSystem.cacheDirectory}roast_${Date.now()}.png`
      await FileSystem.writeAsStringAsync(filename, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      })

      // 4. Share
      await Sharing.shareAsync(filename, {
        mimeType: 'image/png',
        dialogTitle: t('item.labels.shareImage'),
      })
      posthog?.capture('roast_shared_image', {
        roast_id: roast?.id ?? null,
        variant_id: currentVariant?.id ?? null,
        had_share_bonus_badge: !isPro && !hasClaimedShareBonus,
      })

      // 5. Award 3 bonus credits for sharing (one-time global bonus)
      if (roast) {
        const granted = useCreditStore.getState().grantShareBonus()
        if (granted) {
          Burnt.toast({
            title: t('item.alerts.shareBonusTitle'),
            message: t('item.alerts.shareBonusBody'),
            preset: 'done',
            haptic: 'success',
          })
        }
      }
    } catch (error) {
      console.error('Snapshot failed:', error)
      Burnt.toast({
        title: t('common.error'),
        message: t('item.alerts.shareImageFailed'),
        preset: 'error',
        haptic: 'error',
      })
    }
  }, [currentVariant?.id, hasClaimedShareBonus, isDeleting, isPro, posthog, roast, t])

  const handleShareTextPress = useCallback(async () => {
    if (!currentVariant || isDeleting) return

    if (Platform.OS === 'ios') {
      void impactAsync(ImpactFeedbackStyle.Light)
    }

    try {
      await Share.share({
        message: currentVariant.content,
        title: t('item.labels.shareTitle'),
      })
    } catch {
      Burnt.toast({
        title: t('common.error'),
        message: t('item.alerts.shareTextFailed'),
        preset: 'error',
        haptic: 'error',
      })
    }
  }, [currentVariant, isDeleting, t])

  const handleCopyPress = useCallback(async () => {
    if (!currentVariant || isDeleting) return

    if (Platform.OS === 'ios') {
      void selectionAsync()
    }

    await Clipboard.setStringAsync(currentVariant.content)
    Burnt.toast({
      title: t('common.copied'),
      message: t('item.alerts.copiedBody'),
      preset: 'done',
      haptic: 'success',
    })
  }, [currentVariant, isDeleting, t])

  const handleFavoritePress = useCallback(async () => {
    if (!db || !roast || !currentVariant || isTogglingFavorite || isDeleting) return

    if (Platform.OS === 'ios') {
      void selectionAsync()
    }

    const variantId = currentVariant.id
    const nextFavorite = !currentVariant.isFavorite

    setIsTogglingFavorite(true)
    
    // Optimistic Update
    queryClient.setQueryData<RoastWithVariants | null>(roastQueryKey, (prev) => {
      if (!prev) return prev
      return {
        ...prev,
        variants: prev.variants.map((v) =>
          v.id === variantId ? { ...v, isFavorite: nextFavorite } : v
        ),
      }
    })

    try {
      await setRoastVariantFavorite(db, variantId, nextFavorite)
      posthog?.capture('roast_favorite_toggled', {
        roast_id: roast.id,
        variant_id: variantId,
        is_favorite: nextFavorite,
      })
      await refetch()
    } catch {
      Burnt.toast({
        title: t('common.error'),
        message: t('item.alerts.favoriteFailed'),
        preset: 'error',
        haptic: 'error',
      })
      await refetch() // Revert
    } finally {
      setIsTogglingFavorite(false)
    }
  }, [currentVariant, db, isDeleting, isTogglingFavorite, posthog, queryClient, refetch, roast, roastQueryKey, t])

  const runDeleteRoast = useCallback(async () => {
    if (!db || !roast || isDeleting) return

    setIsDeleting(true)
    if (Platform.OS === 'ios') {
      void impactAsync(ImpactFeedbackStyle.Heavy)
    }

    try {
      await deleteRoastById(db, roast.id)
      queryClient.removeQueries({ queryKey: roastQueryKey })
      await queryClient.invalidateQueries({ queryKey: ['roast-history'] })
      posthog?.capture('roast_deleted', {
        roast_id: roast.id,
      })

      if (Platform.OS === 'ios') {
        void notificationAsync(NotificationFeedbackType.Success)
      }

      if (navigation.canGoBack()) {
        navigation.goBack()
      }
    } catch {
      Burnt.toast({
        title: t('item.alerts.deleteFailedTitle'),
        message: t('item.alerts.deleteFailedBody'),
        preset: 'error',
        haptic: 'error',
      })
    } finally {
      setIsDeleting(false)
    }
  }, [db, isDeleting, navigation, posthog, queryClient, roast, roastQueryKey, t])

  const confirmDeleteRoast = useCallback(() => {
    if (!roast || isDeleting) return

    Alert.alert(
      t('item.delete.title'),
      t('item.delete.body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void runDeleteRoast()
          },
        },
      ]
    )
  }, [isDeleting, roast, runDeleteRoast, t])

  useEffect(() => {
    const headerTitle = roast
      ? `${audienceLabel} | ${burnMeta.label} ${currentIndex + 1}/${Math.max(variants.length, 1)}`
      : t('navigation.roast')

    navigation.setOptions({
      headerShown: true,
      title: headerTitle,
      ...(Platform.OS === 'ios'
        ? {
            unstable_headerRightItems: () => [
              {
                type: 'menu',
                variant: 'prominent',
                tintColor: AppTheme.colors.primary,
                label: t('item.menu.actions'),
                icon: { type: 'sfSymbol', name: 'ellipsis.circle' },
                menu: {
                  title: t('item.menu.actionsTitle'),
                  items: [
                    {
                      type: 'action',
                      label: t('item.menu.copyRoast'),
                      icon: { type: 'sfSymbol', name: 'doc.on.doc' },
                      disabled: !currentVariant,
                      onPress: () => {
                        void handleCopyPress()
                      },
                    },
                    {
                      type: 'action',
                      label: t('item.menu.shareText'),
                      icon: { type: 'sfSymbol', name: 'square.and.arrow.up' },
                      disabled: !currentVariant,
                      onPress: () => {
                        void handleShareTextPress()
                      },
                    },
                    {
                      type: 'action',
                      label: currentVariant?.isFavorite
                        ? t('item.menu.unfavorite')
                        : t('item.menu.favorite'),
                      icon: {
                        type: 'sfSymbol',
                        name: currentVariant?.isFavorite ? 'heart.slash' : 'heart',
                      },
                      disabled: !currentVariant || isTogglingFavorite,
                      onPress: () => {
                        void handleFavoritePress()
                      },
                    },
                    {
                      type: 'action',
                      label: t('item.menu.deleteRoast'),
                      icon: { type: 'sfSymbol', name: 'trash' },
                      destructive: true,
                      disabled: !roast || isDeleting,
                      onPress: () => {
                        confirmDeleteRoast()
                      },
                    },
                  ],
                },
              },
            ],
          }
          : {}),
    })
  }, [
    burnMeta.label,
    confirmDeleteRoast,
    currentIndex,
    currentVariant,
    handleCopyPress,
    handleFavoritePress,
    handleShareTextPress,
    isDeleting,
    isTogglingFavorite,
    navigation,
    roast,
    audienceLabel,
    t,
    variants.length,
  ])


  // --- RENDER ---

  if (!roast) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: AppTheme.colors.text.muted }}>
          {isLoading ? t('item.status.loading') : t('item.status.notFound')}
        </Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, }}>
      {showConfetti ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 50,
          }}
        >
          <Confetti
            autoplay
            count={160}
            fallDuration={3800}
            fadeOutOnEnd
            onAnimationEnd={() => setShowConfetti(false)}
          
            containerStyle={{
              flex: 1,
            }}
          />
        </View>
      ) : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 120,
          alignItems: 'center',
        }}
      >
        {/* --- THE POLAROID CARD (Captured by Skia) --- */}
        <View
          ref={cardRef}
          collapsable={false} // CRITICAL for Skia capture
          style={{
            width: cardWidth,
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '0px 12px 24px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* 1. IMAGE SECTION (Top) */}
          <View style={{ width: '100%', height: cardImageHeight, backgroundColor: '#FAFAFA', position: 'relative' }}>
            {roast.inputType === 'image' && roast.inputImageUri ? (
              <Image
                source={roast.inputImageUri}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              // Fallback for Text Input visualizations
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                <MaterialCommunityIcons name="format-quote-close" size={64} color={AppTheme.colors.border} style={{ marginBottom: 16 }} />
                <Text numberOfLines={4} style={{ fontSize: 20, fontWeight: '600', color: '#1A1A1A', textAlign: 'center' }}>
                  {`"${roast.inputText ?? ''}"`}
                </Text>
              </View>
            )}

            {/* Floating Audience Badge (Top Left) */}
            <View style={{ position: 'absolute', top: 16, left: 16 }}>
              <View style={{ 
                backgroundColor: 'rgba(255,255,255,0.95)', 
                paddingHorizontal: 10, paddingVertical: 6, 
                borderRadius: 8,
                boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.10)',
              }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#1A1A1A', textTransform: 'uppercase' }}>
                  {t('item.labels.for')}: {audienceLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* 2. ROAST TEXT SECTION (Bottom) */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              paddingTop: 20,
              paddingBottom: 14,
              minHeight: 160,
            }}
          >
            {variants.length > 0 ? (
              <Animated.FlatList<VariantItem>
                ref={variantPagerRef}
                data={variants}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item, index }) => (
                  <VariantSlide
                    content={item.content}
                    index={index}
                    pageWidth={cardWidth}
                    scrollX={variantScrollX}
                  />
                )}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={variantScrollHandler}
                onMomentumScrollEnd={handleVariantMomentumEnd}
                scrollEventThrottle={16}
                disableIntervalMomentum
                decelerationRate="fast"
                initialNumToRender={1}
                maxToRenderPerBatch={3}
                windowSize={3}
                getItemLayout={(_, index) => ({
                  length: cardWidth,
                  offset: cardWidth * index,
                  index,
                })}
                style={{ width: cardWidth }}
              />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: AppTheme.colors.text.muted }}>{t('item.status.noVariants')}</Text>
              </View>
            )}

            {/* Footer Metadata */}
            <View 
              style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                paddingHorizontal: 24,
                marginTop: 4,
              }}
            >
              {/* Pagination Dots */}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {variants.map((variant, index) => (
                  <VariantDot
                    key={variant.id}
                    index={index}
                    pageWidth={cardWidth}
                    scrollX={variantScrollX}
                  />
                ))}
              </View>

              {/* Burn Level Indicator */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: burnMeta.color, letterSpacing: 0.5 }}>
                  {burnMeta.label}
                </Text>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: burnMeta.color }} />
              </View>
            </View>
          </View>
        </View>
        
        {/* Watermark/Brand Text below card (Optional) */}
        <Text style={{ marginTop: 24, color: AppTheme.colors.text.muted, fontSize: 12, fontWeight: '600' }}>
          {t('item.labels.brand')} • {formatDate(roast.createdAt)}
        </Text>
      </ScrollView>

      {/* --- ACTION BAR (Bottom Sheet) --- */}
      <View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: '#FFFFFF',
          paddingTop: 20,
          paddingBottom: Math.max(insets.bottom, 20),
          paddingHorizontal: 24,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          boxShadow: '0px -4px 10px rgba(0, 0, 0, 0.05)',
          flexDirection: 'row', alignItems: 'center', gap: 16
        }}
      >
        {showShareBonusBadge ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -12,
              right: 24,
              backgroundColor: AppTheme.colors.primary,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              borderCurve: 'continuous',
              borderWidth: 2,
              borderColor: '#FFFFFF',
              boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.12)',
              zIndex: 2,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '900' }}>
              {t('item.labels.shareBonus')}
            </Text>
          </View>
        ) : null}

        {Platform.OS === 'ios' && !isIOS26OrNewer ? (
          <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <PressableScale
              onPress={() => void handleFavoritePress()}
              style={{ opacity: isTogglingFavorite || isDeleting || !currentVariant ? 0.55 : 1 }}
            >
              <Animated.View
                style={[
                  {
                    width: 52,
                    height: 52,
                    borderRadius: 18,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  favoriteButtonAnimatedStyle,
                ]}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Animated.View
                    style={[{ position: 'absolute' }, favoriteOutlineIconAnimatedStyle]}
                  >
                    <Ionicons name="heart-outline" size={24} color="#374151" />
                  </Animated.View>
                  <Animated.View
                    style={[{ position: 'absolute' }, favoriteFilledIconAnimatedStyle]}
                  >
                    <Ionicons name="heart" size={24} color={AppTheme.colors.primary} />
                  </Animated.View>
                </View>
              </Animated.View>
            </PressableScale>

            <Host
              matchContents
              useViewportSizeMeasurement
              style={{ flex: 1, alignItems: 'center' }}
            >
              <HStack spacing={12} modifiers={[frame({ width: Math.max(120, cardWidth - 72) })]}>
                <View style={{ position: 'relative' }}>
                  <IOSButton
                    onPress={() => void handleSharePress()}
                    label={t('item.labels.shareImage')}
                    systemImage="square.and.arrow.up"
                    modifiers={[
                      buttonStyle('glassProminent'),
                      controlSize('large'),
                      tint(AppTheme.colors.primary),
                      frame({ minWidth: Math.max(120, Math.min(200, cardWidth - 180)) }),
                      disabled(isDeleting),
                    ]}
                  />
                </View>
                <IOSButton
                  onPress={() => void handleCopyPress()}
                  label={t('item.labels.copy')}
                  systemImage="doc.on.doc"
                  modifiers={[
                    buttonStyle('glassProminent'),
                    controlSize('large'),
                    labelStyle('iconOnly'),
                    tint('#374151'),
                    disabled(isDeleting || !currentVariant),
                  ]}
                />
              </HStack>
            </Host>
          </View>
        ) : (
          <>
            <PressableScale 
              onPress={() => void handleFavoritePress()} 
            >
              <Animated.View
                style={[
                  {
                    width: 52,
                    height: 52,
                    borderRadius: 18,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  favoriteButtonAnimatedStyle,
                ]}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Animated.View
                    style={[{ position: 'absolute' }, favoriteOutlineIconAnimatedStyle]}
                  >
                    <Ionicons name="heart-outline" size={24} color="#374151" />
                  </Animated.View>
                  <Animated.View
                    style={[{ position: 'absolute' }, favoriteFilledIconAnimatedStyle]}
                  >
                    <Ionicons name="heart" size={24} color={AppTheme.colors.primary} />
                  </Animated.View>
                </View>
              </Animated.View>
            </PressableScale>

            <PressableScale 
              onPress={() => void handleSharePress()}
              style={{ 
                  flex: 1, height: 56, 
                  backgroundColor: AppTheme.colors.primary, 
                  borderRadius: 18, 
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0px 4px 8px rgba(234, 88, 12, 0.30)',
              }}
            >
              <Ionicons name="share-social" size={20} color="white" style={{ fontWeight: 'bold' }} />
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>
                {t('item.labels.shareImage')}
              </Text>
            </PressableScale>

            <PressableScale 
              onPress={() => void handleCopyPress()} 
              style={{ 
                  padding: 14, 
                  backgroundColor: '#F3F4F6', 
                  borderRadius: 18,
                  borderWidth: 1, borderColor: '#E5E7EB'
              }}
            >
              <Ionicons name="copy-outline" size={24} color="#374151" />
            </PressableScale>
          </>
        )}
      </View>
    </View>
  )
}
