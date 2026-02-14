import { CREDIT_PACKAGES } from '@/constants/Subscriptions'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import zustandStorage from './storage'

interface CreditState {
  credits: number
  /** Transaction IDs already claimed (prevents double-grant on restore). */
  claimedTransactionIds: string[]
  /** Whether the user has already claimed the one-time share bonus. */
  hasClaimedShareBonus: boolean;

  addCredits: (productId: string, transactionId?: string) => void
  deductCredit: () => void
  hasCredits: () => boolean
  /** Awards 3 bonus credits for the first time the user shares a roast image. */
  grantShareBonus: () => boolean
  restoreCredits: (
    transactions: { productIdentifier: string; transactionIdentifier: string }[]
  ) => void
}

export const useCreditStore = create<CreditState>()(
  persist(
    (set, get) => ({
      credits: 1,
      claimedTransactionIds: [],
      hasClaimedShareBonus: false,

      addCredits: (productId: string, transactionId?: string) => {
        const amount = CREDIT_PACKAGES[productId]
        if (!amount) {
          console.warn(`Unknown product ID for credits: ${productId}`)
          return
        }

        // Idempotency: don't double-grant the same transaction
        if (transactionId && get().claimedTransactionIds.includes(transactionId)) {
          return
        }

        set((state) => ({
          credits: state.credits + amount,
          claimedTransactionIds: transactionId
            ? [...state.claimedTransactionIds, transactionId]
            : state.claimedTransactionIds,
        }))
      },

      deductCredit: () => {
        set((state) => ({
          credits: Math.max(0, state.credits - 1),
        }))
      },

      hasCredits: () => get().credits > 0,

      grantShareBonus: () => {
        if (get().hasClaimedShareBonus) return false
        set((state) => ({
          credits: state.credits + 3,
          hasClaimedShareBonus: true,
        }))
        return true
      },

      /**
       * Best-effort credit recovery on reinstall.
       * Replays all non-subscription transactions from RevenueCat that
       * haven't already been claimed locally.
       */
      restoreCredits: (transactions) => {
        const { claimedTransactionIds } = get()
        let creditsToAdd = 0
        const newClaimedIds: string[] = []

        for (const tx of transactions) {
          if (claimedTransactionIds.includes(tx.transactionIdentifier)) continue
          const amount = CREDIT_PACKAGES[tx.productIdentifier]
          if (!amount) continue
          creditsToAdd += amount
          newClaimedIds.push(tx.transactionIdentifier)
        }

        if (creditsToAdd > 0) {
          set((state) => ({
            credits: state.credits + creditsToAdd,
            claimedTransactionIds: [...state.claimedTransactionIds, ...newClaimedIds],
          }))
        }
      },
    }),
    {
      name: 'credit-store',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
)
