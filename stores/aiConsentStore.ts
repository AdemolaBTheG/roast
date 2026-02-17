import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import zustandStorage from './storage'

interface AiConsentState {
  hasAcceptedAiProcessing: boolean
  acceptedAtIso: string | null
  grantAiConsent: () => void
  revokeAiConsent: () => void
}

export const useAiConsentStore = create<AiConsentState>()(
  persist(
    (set) => ({
      hasAcceptedAiProcessing: false,
      acceptedAtIso: null,
      grantAiConsent: () =>
        set(() => ({
          hasAcceptedAiProcessing: true,
          acceptedAtIso: new Date().toISOString(),
        })),
      revokeAiConsent: () =>
        set(() => ({
          hasAcceptedAiProcessing: false,
          acceptedAtIso: null,
        })),
    }),
    {
      name: 'ai-consent-store',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
)
