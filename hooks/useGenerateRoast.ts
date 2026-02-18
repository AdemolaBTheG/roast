import { useMutation } from '@tanstack/react-query'
import {
  generateRoastRequest,
  RoastGenerateRequest,
  RoastGenerateResponse,
} from '@/services/roast-api'
import { useAiConsentStore } from '@/stores/aiConsentStore'

export class AiConsentRequiredError extends Error {
  constructor() {
    super('AI consent required')
    this.name = 'AiConsentRequiredError'
  }
}

async function ensureAiConsentGranted(): Promise<void> {
  const { hasAcceptedAiProcessing } = useAiConsentStore.getState()
  if (hasAcceptedAiProcessing) return
  throw new AiConsentRequiredError()
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
