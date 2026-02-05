import { env } from '@xenova/transformers'

/**
 * Check if a model is cached in the browser
 */
export async function isModelCached(modelPath: string): Promise<boolean> {
  try {
    // Transformers.js uses Cache API to store models
    const cacheNames = await caches.keys()
    const transformersCache = cacheNames.find((name) =>
      name.includes('transformers') || name.includes('huggingface')
    )

    if (!transformersCache) {
      return false
    }

    const cache = await caches.open(transformersCache)
    const cachedRequests = await cache.keys()

    // Check if any cached request contains the model path
    const modelCached = cachedRequests.some((request) => request.url.includes(modelPath))

    return modelCached
  } catch (error) {
    console.warn('Error checking cache:', error)
    return false
  }
}

/**
 * Get all cached models
 */
export async function getCachedModels(): Promise<string[]> {
  try {
    const cacheNames = await caches.keys()
    const cachedModels: Set<string> = new Set()

    for (const cacheName of cacheNames) {
      if (cacheName.includes('transformers') || cacheName.includes('huggingface')) {
        const cache = await caches.open(cacheName)
        const requests = await cache.keys()

        requests.forEach((request) => {
          // Extract model names from URLs
          const url = request.url
          const match = url.match(/models\/([^/]+\/[^/]+)/)
          if (match && match[1]) {
            cachedModels.add(match[1])
          }
        })
      }
    }

    return Array.from(cachedModels)
  } catch (error) {
    console.warn('Error getting cached models:', error)
    return []
  }
}

/**
 * Clear all cached models
 */
export async function clearModelCache(): Promise<void> {
  try {
    const cacheNames = await caches.keys()

    for (const cacheName of cacheNames) {
      if (cacheName.includes('transformers') || cacheName.includes('huggingface')) {
        await caches.delete(cacheName)
        console.log(`Cleared cache: ${cacheName}`)
      }
    }
  } catch (error) {
    console.error('Error clearing cache:', error)
    throw error
  }
}

/**
 * Get cache size estimate
 */
export async function getCacheSize(): Promise<{ usage: number; quota: number }> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      }
    }
    return { usage: 0, quota: 0 }
  } catch (error) {
    console.warn('Error getting cache size:', error)
    return { usage: 0, quota: 0 }
  }
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
