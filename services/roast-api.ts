import { getCurrentAppLanguage, type AppLanguage } from '@/i18n'

export const ROAST_AUDIENCES = [
  'Bestie',
  'Sibling',
  'Ex',
  'Coworker',
  'Self',
  'Stranger',
] as const

export type RoastAudience = (typeof ROAST_AUDIENCES)[number]

export type RoastGenerateRequest =
  | {
      inputType: 'text'
      text: string
      audience: RoastAudience
      burnLevel: number
      count?: number
      language?: AppLanguage
    }
  | {
      inputType: 'image'
      imageBase64: string
      imageMimeType: string
      audience: RoastAudience
      burnLevel: number
      count?: number
      language?: AppLanguage
    }

export type RoastGenerateResponse = {
  requestId: string
  roast: string
  roasts?: string[]
  roastCount?: number
  requestedCount?: number
  language?: AppLanguage
  model: string
  audience: RoastAudience
  burnLevel: number
  createdAt: string
}

const roastApiBaseUrl = process.env.EXPO_PUBLIC_ROAST_API_URL
const roastApiBearer = process.env.EXPO_PUBLIC_ROAST_API_BEARER

export async function generateRoastRequest(
  payload: RoastGenerateRequest
): Promise<RoastGenerateResponse> {
  if (!roastApiBaseUrl) {
    throw new Error('Missing EXPO_PUBLIC_ROAST_API_URL')
  }

  const baseUrl = roastApiBaseUrl.replace(/\/+$/, '')
  const language = payload.language ?? getCurrentAppLanguage()
  const requestPayload = { ...payload, language }

  const response = await fetch(`${baseUrl}/v1/roasts/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': language,
      ...(roastApiBearer ? { Authorization: `Bearer ${roastApiBearer}` } : {}),
    },
    body: JSON.stringify(requestPayload),
  })

  const rawBody = await response.text()
  let data: Record<string, unknown> = {}

  if (rawBody) {
    try {
      data = JSON.parse(rawBody) as Record<string, unknown>
    } catch {
      data = {}
    }
  }

  if (!response.ok) {
    const apiError = typeof data?.error === 'string' ? data.error : null
    const apiDetail = typeof data?.detail === 'string' ? data.detail : null
    const apiRequestId = typeof data?.requestId === 'string' ? data.requestId : null

    if (apiError) {
      const detail = apiDetail ? `: ${apiDetail}` : ''
      const requestId = apiRequestId ? ` [${apiRequestId}]` : ''
      throw new Error(`${apiError}${detail}${requestId}`)
    }

    const fallback = rawBody?.trim()
    if (fallback) {
      throw new Error(`Request failed (${response.status}): ${fallback.slice(0, 220)}`)
    }

    throw new Error(`Request failed (${response.status})`)
  }

  return data as RoastGenerateResponse
}
