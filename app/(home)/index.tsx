import { AppTheme } from '@/constants/theme'
import { listRoastHistory, type RoastWithVariants } from '@/services/roast-db'
import { useDbStore } from '@/stores/dbStore'
import { Ionicons } from '@expo/vector-icons'
import { LegendList } from '@legendapp/list'
import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { useFocusEffect, useRouter } from 'expo-router'
import { PressableScale } from 'pressto'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString()
}

function getBurnMeta(burnLevel: number, t: (key: string) => string) {
  if (burnLevel <= 30) {
    return { color: '#9CA3AF', label: t('home.burn.playful') }
  }

  if (burnLevel <= 70) {
    return { color: '#F59E0B', label: t('home.burn.savage') }
  }

  return {
    color: burnLevel >= 85 ? AppTheme.colors.danger : AppTheme.colors.secondary,
    label: t('home.burn.unhinged'),
  }
}

export default function Index() {
  const router = useRouter()
  const { t } = useTranslation()
  const { db } = useDbStore()
  const {
    data: history = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<RoastWithVariants[]>({
    queryKey: ['roast-history', Boolean(db)],
    queryFn: async () => {
      if (!db) return []
      return listRoastHistory(db, 100)
    },
    enabled: Boolean(db),
  })

  useFocusEffect(
    React.useCallback(() => {
      if (db) {
        void refetch()
      }
    }, [db, refetch])
  )

  return (
    <LegendList
      contentInsetAdjustmentBehavior="automatic"
      data={history}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={{
        paddingHorizontal: AppTheme.spacing.sm,
      }}
      ItemSeparatorComponent={() => (
        <View style={{ height: AppTheme.spacing.sm }} />
      )}
      renderItem={({ item }) => {
        const selectedVariant =
          item.variants[item.selectedVariantIndex] ?? item.variants[0] ?? null
        const burnMeta = getBurnMeta(item.burnLevel, t)
        const extraVariants = Math.max(0, item.variants.length - 1)

        return (
       <PressableScale

  onPress={() =>
    router.push({
      pathname: '/(item)/[id]',
      params: { id: item.id.toString() },
    })
  }
>
  <View
    style={{
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      padding: 12,
      borderRadius: 20, // Slightly softer radius
      gap: 12,
    }}
  >
    {/* 1. LEFT: THUMBNAIL + VARIANT BADGE */}
    <View
      style={{
        width: 60,
        height: 75,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        overflow: 'hidden', // Clips the image

        position: 'relative', // For absolute positioning the badge
      }}
    >
      {item.inputType === 'image' && item.inputImageUri ? (
        <Image
          source={item.inputImageUri}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="text-outline" size={24} color={AppTheme.colors.text.muted} />
        </View>
      )}

      {/* The Stack Badge (Overlay) */}
      {extraVariants > 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderTopLeftRadius: 8,
          }}
        >
          <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
            +{extraVariants}
          </Text>
        </View>
      )}
    </View>

    {/* 2. RIGHT: CONTENT STACK */}
    <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 2 }}>
      
      {/* HEADER: Audience + Date + Heart */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
             <Text style={{ fontSize: 10, fontWeight: '700', color: AppTheme.colors.text.secondary }}>
               {item.audience.toUpperCase()}
             </Text>
          </View>
          <Text style={{ fontSize: 10, color: AppTheme.colors.text.muted }}>
             • {formatDate(item.createdAt)}
          </Text>
        </View>

        {/* Heart Icon (Top Right) */}
        {selectedVariant?.isFavorite && (
          <Ionicons name="heart" size={14} color={AppTheme.colors.primary} />
        )}
      </View>

      <Text
        numberOfLines={2}
        style={{
          fontSize: 15,
          color: AppTheme.colors.text.primary,
          lineHeight: 20,
          fontWeight: '500', 
          marginVertical: 4,
        }}
      >
        {selectedVariant?.content || t('home.status.generating')}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: burnMeta.color,
          }}
        />
        <Text
          style={{
            fontSize: 11,
            color: burnMeta.color, // Color the text too for flair
            fontWeight: '700',
            letterSpacing: 0.5,
          }}
        >
          {burnMeta.label}
        </Text>
      </View>

    </View>
  </View>
</PressableScale>
        )
      }}
      ListEmptyComponent={
        <View
          style={{
            marginHorizontal: AppTheme.spacing.md,
            marginTop: AppTheme.spacing.xl,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: AppTheme.colors.text.secondary,
              fontSize: AppTheme.typography.size.base,
            }}
          >
            {isLoading
              ? t('home.status.loading')
              : isError
                ? t('home.status.loadError')
                : t('home.status.empty')}
          </Text>
        </View>
      }
    />
  )
}
