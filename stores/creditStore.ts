import { CREDIT_PACKAGES } from '@/constants/Subscriptions'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import zustandStorage from './storage'

interface CreditState {
  credits: number
  /** Transaction IDs already claimed (prevents double-grant across repeated callbacks). */
  claimedTransactionIds: string[]
  /** Whether the user has already claimed the one-time share bonus. */
  hasClaimedShareBonus: boolean;

  addCredits: (productId: string, transactionId?: string) => void
  deductCredit: () => void
  hasCredits: () => boolean
  /** Awards 3 bonus credits for the first time the user shares a roast image. */
  grantShareBonus: () => boolean
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

        set((state) => {
          // Only grant consumables when we can uniquely identify the transaction.
          if (!transactionId) {
            console.warn(`Missing transaction ID for product ${productId}; skipping direct credit grant.`)
            return state
          }

          if (state.claimedTransactionIds.includes(transactionId)) {
            return state
          }

          return {
            credits: state.credits + amount,
            claimedTransactionIds: [...state.claimedTransactionIds, transactionId],
          }
        })
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

    }),
    {
      name: 'credit-store',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
)
