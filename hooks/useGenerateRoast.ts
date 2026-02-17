import { useMutation } from '@tanstack/react-query'
import i18n from '@/i18n'
import {
  generateRoastRequest,
  RoastGenerateRequest,
  RoastGenerateResponse,
} from '@/services/roast-api'
import { useAiConsentStore } from '@/stores/aiConsentStore'
import { Alert } from 'react-native'

export class AiConsentDeclinedError extends Error {
  constructor() {
    super('AI consent declined')
    this.name = 'AiConsentDeclinedError'
  }
}

async function promptForAiConsent(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const settle = (value: boolean) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    Alert.alert(
      i18n.t('add.aiConsent.title'),
      i18n.t('add.aiConsent.body'),
      [
        {
          text: i18n.t('add.aiConsent.decline'),
          style: 'cancel',
          onPress: () => settle(false),
        },
        {
          text: i18n.t('add.aiConsent.allow'),
          onPress: () => settle(true),
        },
      ],
      {
        cancelable: false,
        onDismiss: () => settle(false),
      }
    )
  })
}

async function ensureAiConsentGranted(): Promise<void> {
  const { hasAcceptedAiProcessing } = useAiConsentStore.getState()
  if (hasAcceptedAiProcessing) return

  const granted = await promptForAiConsent()
  if (!granted) {
    throw new AiConsentDeclinedError()
  }

  useAiConsentStore.getState().grantAiConsent()
}

type UseGenerateRoastOptions = {
  onSuccess?: (data: RoastGenerateResponse, variables: RoastGenerateRequest) => void
  onError?: (error: Error, variables: RoastGenerateRequest) => void
}

export function useGenerateRoast(options?: UseGenerateRoastOptions) {
  return useMutation<RoastGenerateResponse, Error, RoastGenerateRequest>({
    mutationFn: async (payload) => {
      await ensureAiConsentGranted()
      return generateRoastRequest(payload)
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}
