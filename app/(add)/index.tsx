import { useSubscription } from '@/context/SubscriptionContext'
import { useGenerateRoast } from '@/hooks/useGenerateRoast'
import { ROAST_AUDIENCES, type RoastAudience } from '@/services/roast-api'
import { saveRoastGeneration } from '@/services/roast-db'
import { useCreditStore } from '@/stores/creditStore'
import { useDbStore } from '@/stores/dbStore'
import { Button, Host, Text as IOSText, Picker, Slider } from '@expo/ui/swift-ui'
import { buttonStyle, controlSize, font, frame, padding, pickerStyle, tag, tint } from '@expo/ui/swift-ui/modifiers'
import { Ionicons } from '@expo/vector-icons'
import { Canvas, Fill, Shader, Skia, useClock } from '@shopify/react-native-skia'
import { useQueryClient } from '@tanstack/react-query'
import * as Burnt from 'burnt'
import { Directory, File, Paths } from 'expo-file-system'
import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { impactAsync, selectionAsync } from 'expo-haptics'
import { Image } from 'expo-image'
import { SaveFormat, useImageManipulator } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { usePostHog } from 'posthog-react-native'
import { PressableScale } from 'pressto'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  ActionSheetIOS,
  Platform,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ViewStyle
} from 'react-native'
import {
  KeyboardAwareScrollView
} from "react-native-keyboard-controller"
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  interpolateColor,
  LinearTransition,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppTheme } from '../../constants/theme'

const AnimatedScrollView = Animated.createAnimatedComponent(KeyboardAwareScrollView)
// --- CONSTANTS ---
const audienceOptions = ROAST_AUDIENCES
type AudienceOption = RoastAudience
const audienceTranslationKeyMap: Record<
  AudienceOption,
  'bestie' | 'sibling' | 'ex' | 'coworker' | 'self' | 'stranger'
> = {
  Bestie: 'bestie',
  Sibling: 'sibling',
  Ex: 'ex',
  Coworker: 'coworker',
  Self: 'self',
  Stranger: 'stranger',
}
const roastCountOptions = [1, 3, 5] as const
type RoastCountOption = (typeof roastCountOptions)[number]
const MAX_UPLOAD_DIMENSION = 1280
const IMAGE_UPLOAD_QUALITY = 0.72
const ROAST_IMAGE_DIRECTORY_NAME = 'roast-images'
const MANIPULATOR_FALLBACK_SOURCE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

// --- TYPES ---
type SelectedImage = {
  uri: string
  base64?: string | null
  mimeType?: string | null
}
type AudienceChipProps = {
  label: string
  isSelected: boolean
  onPress: () => void
}
type ShimmerRectProps = {
  width: number
  height: number
  borderRadius?: number
  isActive?: boolean
  style?: StyleProp<ViewStyle>
}

const SHIMMER_SHADER_EFFECT = Skia.RuntimeEffect.Make(`
uniform float2 u_resolution;
uniform float u_time;

vec4 main(vec2 pos) {
  vec2 uv = pos / u_resolution;

  // Soft diagonal highlight wave.
  float sweep = sin((uv.x + uv.y) * 8.0 - u_time * 2.0) * 0.5 + 0.5;
  sweep = smoothstep(0.2, 0.9, sweep);

  vec3 base = vec3(1.0, 0.96, 0.93);
  vec3 accent = vec3(1.0, 0.77, 0.60);
  vec3 glow = mix(base, accent, sweep * 0.72);

  // Subtle breathing to avoid static feel.
  float pulse = 0.04 * sin(u_time * 1.3 + uv.y * 6.0);
  glow += vec3(pulse * 0.8, pulse * 0.35, pulse * 0.15);

  return vec4(clamp(glow, 0.0, 1.0), 1.0);
}
`)

// --- HELPER FUNCTIONS ---
function persistImageToDocuments(sourceUri: string): string {
  const roastImageDirectory = new Directory(Paths.document, ROAST_IMAGE_DIRECTORY_NAME)
  roastImageDirectory.create({ idempotent: true, intermediates: true })

  const fileName = `roast-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`
  const destinationFile = new File(roastImageDirectory, fileName)
  const sourceFile = new File(sourceUri)

  sourceFile.copy(destinationFile)
  return destinationFile.uri
}

// --- COMPONENTS ---

// 1. Shimmer Effect (Preserved but styled)
function ShimmerRect({
  width,
  height,
  borderRadius = 16,
  isActive = true,
  style,
}: ShimmerRectProps) {
  const clock = useClock()
  const uniforms = useDerivedValue(() => ({
    u_resolution: [width, height],
    u_time: clock.value / 1000,
  }))

  if (!isActive) {
    return null
  }

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      pointerEvents="none"
      style={[{ width, height, borderRadius, overflow: 'hidden', borderCurve: 'continuous' }, style]}
    >
      <Canvas style={{ flex: 1 }}>
        {SHIMMER_SHADER_EFFECT ? (
          <Fill>
            <Shader source={SHIMMER_SHADER_EFFECT} uniforms={uniforms} />
          </Fill>
        ) : (
          <Fill color="#FFF5F0" />
        )}
      </Canvas>
    </Animated.View>
  )
}

// 2. iOS Section Header
function SectionHeader({ title, rightText }: { title: string; rightText?: string }) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingHorizontal: 20,
      marginBottom: 8,
      marginTop: 24
    }}>
      <Text style={{
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280', // systemGray2
        textTransform: 'uppercase',
        letterSpacing: 0.5
      }}>
        {title}
      </Text>
      {rightText && (
        <Text style={{ fontSize: 13, fontWeight: '600', color: AppTheme.colors.primary }}>
          {rightText}
        </Text>
      )}
    </View>
  )
}

// 3. Refined Audience Chip (Pill Style)
function AudienceChip({ label, isSelected, onPress }: AudienceChipProps) {
  const selectionProgress = useSharedValue(isSelected ? 1 : 0)

  useEffect(() => {
    selectionProgress.value = withTiming(isSelected ? 1 : 0, { duration: 170 })
  }, [isSelected, selectionProgress])

  const animatedChipStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selectionProgress.value,
      [0, 1],
      ['#E5E7EB', AppTheme.colors.primary]
    ),
    borderColor: interpolateColor(
      selectionProgress.value,
      [0, 1],
      ['transparent', AppTheme.colors.primary]
    ),
    transform: [{ scale: interpolate(selectionProgress.value, [0, 1], [1, 1.03]) }],
  }))

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(selectionProgress.value, [0, 1], ['#1F2937', '#FFFFFF']),
  }))

  return (
    <PressableScale onPress={onPress} style={{ marginRight: 8 }}>
      <Animated.View
        style={[
          {
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 9999,
       borderCurve:'continuous'
          },
          animatedChipStyle,
        ]}
      >
        <Animated.Text
          style={[
            {
              fontSize: 15,
              fontWeight: '700',
            },
            animatedTextStyle,
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </PressableScale>
  )
}

export default function Index() {
  const router = useRouter()
  const { db } = useDbStore()
  const queryClient = useQueryClient()
  const posthog = usePostHog()
  const { t } = useTranslation()
  const targetFreeGenerationPrompt = t('add.prompts.noTarget')
  const getAudienceLabel = (audience: AudienceOption) =>
    t(`add.audiences.${audienceTranslationKeyMap[audience]}`)
  const { isPro } = useSubscription()
  const credits = useCreditStore((s) => s.credits)
  const deductCredit = useCreditStore((s) => s.deductCredit)
  
  // State
  const [selectedTag, setSelectedTag] = useState<'text' | 'image'>('text')
  const [selectedAudience, setSelectedAudience] = useState<AudienceOption | null>(null)
  const [inputText, setInputText] = useState('')
  const [image, setImage] = useState<SelectedImage | null>(null)
  const [pendingImageAsset, setPendingImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [sliderValue, setSliderValue] = useState(0.5) // Default to 0.5 for UX
  const [roastCount, setRoastCount] = useState<RoastCountOption>(3)
  
  // Layout
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const imageManipulator = useImageManipulator(pendingImageAsset?.uri ?? MANIPULATOR_FALLBACK_SOURCE)

  // Derived Values
  const burnPercent = Math.round(sliderValue * 100)
  const burnLabel =
    burnPercent < 30
      ? `${t('home.burn.playful')} 😇`
      : burnPercent < 75
        ? `${t('home.burn.savage')} 🔥`
        : `${t('home.burn.unhinged')} 💀`
  const burnColor = burnPercent < 30 ? '#34D399' : burnPercent < 75 ? '#F59E0B' : '#EF4444'
  const burnProgress = useSharedValue(sliderValue)
  const ctaPulse = useSharedValue(1)

  useEffect(() => {
    posthog?.capture('screen_viewed', {
      screen_name: 'add',
    })
  }, [posthog])

  useEffect(() => {
    burnProgress.value = withTiming(sliderValue, { duration: 180 })
  }, [burnProgress, sliderValue])

  const burnBadgeStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      burnProgress.value,
      [0, 0.6, 1],
      ['#DCFCE7', '#FEF3C7', '#FEE2E2']
    ),
    transform: [{ scale: interpolate(burnProgress.value, [0, 1], [1, 1.04]) }],
  }))

  const burnBadgeTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      burnProgress.value,
      [0, 0.6, 1],
      ['#047857', '#B45309', '#B91C1C']
    ),
  }))

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaPulse.value }],
  }))

  // --- MUTATION & LOGIC ---
  const generateRoastMutation = useGenerateRoast({
    onSuccess: async (data, variables) => {
      const variants = data.roasts?.map((v) => v.trim()).filter(Boolean) ?? (data.roast?.trim() ? [data.roast.trim()] : [])
      
      if (variants.length === 0) {
        posthog?.capture('roast_generation_failed', {
          stage: 'model_response',
          reason: 'empty_variants',
          input_type: variables.inputType,
          audience: variables.audience,
          burn_level: variables.burnLevel,
          requested_count: variables.count ?? 1,
        })
        Burnt.toast({
          title: t('add.alerts.generationFailedTitle'),
          message: t('add.alerts.generationFailedEmpty'),
          preset: 'error',
          haptic: 'error',
        })
        return
      }

      if (!db) return

      const imageUri = variables.inputType === 'image' ? image?.uri ?? null : null
      const persistedInputText =
        variables.inputType === 'text' && variables.text !== targetFreeGenerationPrompt
          ? variables.text
          : null
      const savedRoastId = await saveRoastGeneration(db, {
        requestId: data.requestId,
        model: data.model,
        audience: data.audience,
        burnLevel: data.burnLevel,
        inputType: variables.inputType,
        inputText: persistedInputText,
        inputImageUri: imageUri,
        variants,
      })

      if (!savedRoastId) {
        posthog?.capture('roast_generation_failed', {
          stage: 'local_persistence',
          reason: 'save_roast_failed',
          request_id: data.requestId,
          input_type: variables.inputType,
          audience: variables.audience,
          burn_level: variables.burnLevel,
          requested_count: variables.count ?? 1,
          variant_count: variants.length,
        })
        return
      }

      posthog?.capture('roast_generation_succeeded', {
        request_id: data.requestId,
        input_type: variables.inputType,
        audience: data.audience,
        burn_level: data.burnLevel,
        requested_count: variables.count ?? 1,
        variant_count: variants.length,
        model: data.model,
      })

      // Deduct 1 credit after successful generation (Pro users skip)
      if (!isPro) {
        deductCredit()
      }

      // Invalidate list so home screen picks up the new roast
      queryClient.invalidateQueries({ queryKey: ['roast-history'] })

      router.replace({
        pathname: '/(item)/[id]',
        params: { id: savedRoastId.toString(), celebrate: '1' },
      })
    },
    onError: (error, variables) => {
      posthog?.capture('roast_generation_failed', {
        stage: 'api_request',
        reason: error.message || 'unknown_error',
        input_type: variables.inputType,
        audience: variables.audience,
        burn_level: variables.burnLevel,
        requested_count: variables.count ?? 1,
      })
      Burnt.toast({
        title: t('add.alerts.generationFailedTitle'),
        message: error.message || t('add.alerts.generationFailedGeneric'),
        preset: 'error',
        haptic: 'error',
      })
    },
  })

  const isGenerating = generateRoastMutation.isPending
  const isPreparingImage = pendingImageAsset !== null
  const isBusy = isGenerating || isPreparingImage
  const isGenerateReady = !isBusy

  useEffect(() => {
    if (isGenerateReady) {
      ctaPulse.value = withRepeat(
        withTiming(1.025, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
      return
    }

    cancelAnimation(ctaPulse)
    ctaPulse.value = withTiming(1, { duration: 160 })
  }, [ctaPulse, isGenerateReady])

  // --- IMAGE PROCESSING ---
  useEffect(() => {
    if (!pendingImageAsset) return
    let isCancelled = false

    const processPendingImage = async () => {
      try {
        const width = pendingImageAsset.width ?? 0
        const height = pendingImageAsset.height ?? 0
        const shouldResize = width > MAX_UPLOAD_DIMENSION || height > MAX_UPLOAD_DIMENSION

        imageManipulator.reset()
        if (shouldResize) {
          imageManipulator.resize(width >= height ? { width: MAX_UPLOAD_DIMENSION } : { height: MAX_UPLOAD_DIMENSION })
        }

        const renderedImage = await imageManipulator.renderAsync()
        const savedImage = await renderedImage.saveAsync({
          base64: true,
          compress: IMAGE_UPLOAD_QUALITY,
          format: SaveFormat.JPEG,
        })
        renderedImage.release()

        if (!savedImage.base64) throw new Error('Image base64 payload is missing')

        const persistentUri = persistImageToDocuments(savedImage.uri)
        if (!isCancelled) {
          setImage({ uri: persistentUri, base64: savedImage.base64, mimeType: 'image/jpeg' })
        }
      } catch {
        if (!isCancelled) Burnt.toast({
          title: t('add.alerts.imageErrorTitle'),
          message: t('add.alerts.imageErrorBody'),
          preset: 'error',
          haptic: 'error',
        })
      } finally {
        if (!isCancelled) setPendingImageAsset(null)
      }
    }
    void processPendingImage()
    return () => { isCancelled = true }
  }, [imageManipulator, pendingImageAsset, t])

  // --- HANDLERS ---
  const toggleAudience = (option: AudienceOption) => {
    void selectionAsync()
    setSelectedAudience((current) => (current === option ? null : option))
  }

  const handleSliderChange = (val: number) => {
    if (Math.round(val * 10) !== Math.round(sliderValue * 10)) selectionAsync()
    setSliderValue(val)
  }

  const promptOpenSettingsAlert = (title: string, message: string) => {
    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.openSettings'),
        onPress: () => {
          void Linking.openSettings()
        },
      },
    ])
  }

  const ensureCameraPermission = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (permission.granted) return true

    promptOpenSettingsAlert(
      t('add.alerts.cameraPermissionTitle'),
      t('add.alerts.cameraPermissionBody')
    )
    return false
  }

  const ensureMediaLibraryPermission = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (permission.granted) return true

    promptOpenSettingsAlert(
      t('add.alerts.photoPermissionTitle'),
      t('add.alerts.photoPermissionBody')
    )
    return false
  }

  const pickFromCamera = async () => {
    const hasPermission = await ensureCameraPermission()
    if (!hasPermission) return

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    })

    if (!result.canceled) {
      setPendingImageAsset(result.assets[0])
    }
  }

  const pickFromLibrary = async () => {
    const hasPermission = await ensureMediaLibraryPermission()
    if (!hasPermission) return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    })

    if (!result.canceled) {
      setPendingImageAsset(result.assets[0])
    }
  }

  const handleImagePress = async () => {
    if (isBusy) return
    impactAsync()
    
    if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [
              t('common.cancel'),
              t('add.actionSheet.takePhoto'),
              t('add.actionSheet.chooseFromLibrary'),
            ],
            cancelButtonIndex: 0,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) void pickFromCamera()
            if (buttonIndex === 2) void pickFromLibrary()
          }
        )
    } else {
        Alert.alert(
          t('add.uploadOptional'),
          undefined,
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('add.actionSheet.takePhoto'), onPress: () => void pickFromCamera() },
            { text: t('add.actionSheet.chooseFromLibrary'), onPress: () => void pickFromLibrary() },
          ]
        )
    }
  }

  const handleGeneratePress = () => {
    if (isGenerating || isPreparingImage) return
    const resolvedAudience: AudienceOption = selectedAudience ?? 'Stranger'

    // Gate: Pro users bypass, otherwise check credits
    if (!isPro && credits < 1) {
      posthog?.capture('roast_generation_blocked', {
        reason: 'no_credits',
        screen_name: 'add',
      })
      router.push('/(paywalls)')
      return
    }
    
    if (selectedTag === 'text') {
      const text = inputText.trim() || targetFreeGenerationPrompt
      posthog?.capture('roast_generation_started', {
        input_type: 'text',
        audience: resolvedAudience,
        burn_level: burnPercent,
        requested_count: roastCount,
        has_user_text: text !== targetFreeGenerationPrompt,
        is_pro: isPro,
        credits_before: credits,
      })
      generateRoastMutation.mutate({
        inputType: 'text',
        text,
        audience: resolvedAudience,
        burnLevel: burnPercent,
        count: roastCount,
      })
    } else {
      if (image?.base64) {
        posthog?.capture('roast_generation_started', {
          input_type: 'image',
          audience: resolvedAudience,
          burn_level: burnPercent,
          requested_count: roastCount,
          is_pro: isPro,
          credits_before: credits,
        })
        generateRoastMutation.mutate({
          inputType: 'image',
          imageBase64: image.base64,
          imageMimeType: image.mimeType || 'image/jpeg',
          audience: resolvedAudience,
          burnLevel: burnPercent,
          count: roastCount,
        })
        return
      }

      posthog?.capture('roast_generation_started', {
        input_type: 'text',
        source_tab: 'image',
        used_fallback_prompt: true,
        audience: resolvedAudience,
        burn_level: burnPercent,
        requested_count: roastCount,
        is_pro: isPro,
        credits_before: credits,
      })
      generateRoastMutation.mutate({
        inputType: 'text',
        text: targetFreeGenerationPrompt,
        audience: resolvedAudience,
        burnLevel: burnPercent,
        count: roastCount,
      })
    }
  }

  // --- RENDER ---
  return (
    <View style={{ flex: 1 }}> 

     
        <AnimatedScrollView
        
          layout={LinearTransition.springify()}
          contentContainerStyle={{
            paddingBottom: 160, // Space for bottom dock
            paddingTop: insets.top,
          }}
          keyboardShouldPersistTaps="handled"
        >
        

          {/* SECTION 1: INPUT CONTENT */}
          <Animated.View
            style={{ marginHorizontal: 16, marginBottom: 8 }}
          >
             <Host useViewportSizeMeasurement matchContents style={{ width: '100%',flex:1 }}>
                <Picker
                  modifiers={[pickerStyle('segmented')]}
                  selection={selectedTag}
                  onSelectionChange={(val) => {
                    selectionAsync()
                    setSelectedTag(val)
                  }}
                >
                  <IOSText modifiers={[tag('text')]}>{t('add.tabs.text')}</IOSText>
                  <IOSText modifiers={[tag('image')]}>{t('add.tabs.image')}</IOSText>
                </Picker>
             </Host>
          </Animated.View>

          {/* Main Card */}
          <Animated.View
          layout={LinearTransition.springify()}
            style={{
              marginHorizontal: 16,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 16,
              minHeight: 180,
              marginTop:24,
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
            }}
          >
            <View>
              {selectedTag === 'text' ? (
                <View>
                    <TextInput
                        placeholder={t('add.placeholder')}
                        placeholderTextColor="#9CA3AF"
                        numberOfLines={6}
                        multiline
                        value={inputText}
                        onChangeText={setInputText}
                        editable={!isBusy}
                        style={{
                            fontSize: 17,
                            color: '#000000',
                            lineHeight: 24,
                            minHeight: 140,
                            textAlignVertical: 'top'
                        }}
                    />
                    {isGenerating && <ShimmerRect width={width - 64} height={140} style={{ position: 'absolute' }} />}
                </View>
              ) : (
                <PressableScale onPress={handleImagePress} style={{ alignItems: 'center', paddingVertical: 10 }}>
                  {image ? (
                    <View style={{ boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.10)' }}>
                        <Image source={image.uri} style={{ width: width * 0.5, aspectRatio: 4/5, borderRadius: 12 }} />
                        {isBusy && <ShimmerRect width={width * 0.5} height={(width * 0.5) * 1.25} style={{ position: 'absolute', borderRadius: 12, borderCurve: 'continuous' }} />}
                        <View style={{ position: 'absolute', bottom: -12, alignSelf: 'center', backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderCurve: 'continuous', boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.10)' }}>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: AppTheme.colors.primary }}>
                              {t('add.tapToChange')}
                            </Text>
                        </View>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', gap: 12, padding: 30, borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 16, borderCurve: 'continuous', width: '100%' }}>
                        <Ionicons name="camera" size={40} color={AppTheme.colors.primary} />
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#6B7280' }}>
                          {t('add.uploadOptional')}
                        </Text>
                    </View>
                  )}
                </PressableScale>
              )}
            </View>
          </Animated.View>

          {/* SECTION 2: AUDIENCE */}
          <Animated.View layout={LinearTransition.springify()}>
            <SectionHeader
              title={t('add.sections.target')}
              rightText={selectedAudience ? getAudienceLabel(selectedAudience) : ''}
            />
            <View>
              <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ paddingHorizontal: 16 }}
              >
                  {audienceOptions.map((option) => (
                      <AudienceChip
                          key={option}
                          label={getAudienceLabel(option)}
                          isSelected={selectedAudience === option}
                          onPress={() => toggleAudience(option)}
                      />
                  ))}
              </ScrollView>
            </View>
          </Animated.View>

          {/* SECTION 3: SETTINGS (Intensity & Count) */}
          <Animated.View layout={LinearTransition.springify()}>
          <SectionHeader title={t('add.sections.configuration')} rightText={`${burnPercent}%`} />
          <Animated.View
            style={{
              marginHorizontal: 16,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 20,
            }}
          >
            {/* Intensity Label */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 8 }}>
                <Animated.View
                  style={[
                    {
                      borderRadius: 999,
                      borderCurve: 'continuous',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    },
                    burnBadgeStyle,
                  ]}
                >
                <Animated.Text style={[{ fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }, burnBadgeTextStyle]}>
                    {burnLabel}
                </Animated.Text>
                </Animated.View>
            </View>

            {/* Slider */}
            <Host matchContents style={{ width: '100%' }}>
              <Slider
                value={sliderValue}
                onValueChange={handleSliderChange}
                modifiers={[tint(burnColor)]}
              />
            </Host>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 24 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#D1D5DB' }}>
                  {t('home.burn.playful')}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#D1D5DB' }}>
                  {t('home.burn.unhinged')}
                </Text>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: '#F3F4F6', marginHorizontal: -20, marginBottom: 16 }} />

            {/* Count Picker */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1F2937' }}>
                  {t('add.variantCount')}
                </Text>
                <Host matchContents>
                    <Picker<RoastCountOption>
                        modifiers={[pickerStyle('menu'), frame({ width: 100 })]}
                        selection={roastCount}
                        onSelectionChange={setRoastCount}
                    >
                        {roastCountOptions.map(opt => (
                            <IOSText key={opt} modifiers={[tag(opt)]}>
                              {opt}
                            </IOSText>
                        ))}
                    </Picker>
                </Host>
            </View>
          </Animated.View>
          </Animated.View>

        </AnimatedScrollView>

      {/* BOTTOM DOCK (Sticky Button) */}
      <View style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20,
        paddingBottom: Math.max(insets.bottom, 20),
        paddingTop: 20,
        backgroundColor: 'rgba(255,255,255,0.95)', 
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(0,0,0,0.1)',
        boxShadow: '0px -4px 10px rgba(0, 0, 0, 0.05)',
      }}>
        <Animated.View style={[{ width: '100%', alignItems: 'center' }, ctaAnimatedStyle]}>
         <Host matchContents style={{ width: '100%', alignItems: 'center' }}>
            <Button
                onPress={handleGeneratePress}
                modifiers={[
                    buttonStyle(isLiquidGlassAvailable() ? "glassProminent" : "borderedProminent"),
                    tint(AppTheme.colors.primary),
                    controlSize("large"),
                    frame({ width: width - 40 })
                ]}
            >
                <IOSText modifiers={[font({ size: 19, weight: "bold" }), padding({ vertical: 4 })]}>
                    {isPreparingImage ? t('add.cta.processingImage') : isGenerating ? t('add.cta.generating') : t('add.cta.default')}
                </IOSText>
            </Button>
         </Host>
        </Animated.View>
      </View>
      
    </View>
  )
}

