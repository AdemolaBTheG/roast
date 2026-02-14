import { useMutation } from '@tanstack/react-query'
import {
  generateRoastRequest,
  RoastGenerateRequest,
  RoastGenerateResponse,
} from '@/services/roast-api'

type UseGenerateRoastOptions = {
  onSuccess?: (data: RoastGenerateResponse, variables: RoastGenerateRequest) => void
  onError?: (error: Error) => void
}

export function useGenerateRoast(options?: UseGenerateRoastOptions) {
  return useMutation<RoastGenerateResponse, Error, RoastGenerateRequest>({
    mutationFn: generateRoastRequest,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}
