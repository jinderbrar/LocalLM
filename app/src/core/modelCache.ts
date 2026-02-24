import { DEFAULT_MODEL_ID } from './generate/models'

const CACHE_VERSION = '2.0' // Bumped for Gemma 3 model change
const CACHE_KEY = 'model-cache-status'

export interface ModelCacheStatus {
  version: string
  modelId: string
  generationCached: boolean
  embeddingCached: boolean
  timestamp: number
}

/**
 * Check if models are cached in browser Cache Storage
 */
export async function checkModelCache(): Promise<{ hasCache: boolean; status: ModelCacheStatus | null }> {
  try {
    // Check localStorage for cache status
    const stored = localStorage.getItem(CACHE_KEY)
    if (!stored) {
      return { hasCache: false, status: null }
    }

    const status: ModelCacheStatus = JSON.parse(stored)

    // Validate cache version and model ID
    if (status.version !== CACHE_VERSION || status.modelId !== DEFAULT_MODEL_ID) {
      console.log('Cache invalid: version or model mismatch')
      localStorage.removeItem(CACHE_KEY)
      return { hasCache: false, status: null }
    }

    // Check if cache is too old (older than 7 days)
    const cacheAge = Date.now() - status.timestamp
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
    if (cacheAge > maxAge) {
      console.log('Cache expired (older than 7 days)')
      localStorage.removeItem(CACHE_KEY)
      return { hasCache: false, status: null }
    }

    // Verify actual cache exists
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      const hasTransformersCache = cacheNames.some(
        (name) => name.includes('transformers') || name.includes('huggingface')
      )

      if (!hasTransformersCache) {
        console.log('Cache status exists but actual cache missing')
        localStorage.removeItem(CACHE_KEY)
        return { hasCache: false, status: null }
      }
    }

    console.log('✅ Models found in cache, skipping download')
    return { hasCache: true, status }
  } catch (error) {
    console.error('Error checking model cache:', error)
    return { hasCache: false, status: null }
  }
}

/**
 * Mark models as cached
 */
export function markModelsCached(): void {
  const status: ModelCacheStatus = {
    version: CACHE_VERSION,
    modelId: DEFAULT_MODEL_ID,
    generationCached: true,
    embeddingCached: true,
    timestamp: Date.now(),
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(status))
  console.log('✅ Models marked as cached')
}

/**
 * Clear cache status
 */
export function clearCacheStatus(): void {
  localStorage.removeItem(CACHE_KEY)
  console.log('🗑️ Cache status cleared')
}
