import { initGenerationModel, DEFAULT_MODEL_ID } from './generate'
import { initEmbeddingModel } from './index_vec/embeddings'
import { env } from '@xenova/transformers'
import '@/core/strategies/bootstrap' // Bootstrap all strategies
import { logRegisteredStrategies } from '@/core/strategies/bootstrap'
import { RAGPipeline } from './pipeline/RAGPipeline'
import { checkModelCache, markModelsCached } from './modelCache'
import { modelProgressTracker } from './modelProgress'

// Configure Transformers.js
env.allowRemoteModels = true
env.allowLocalModels = false

// Models are cached in browser Cache Storage automatically
// No need to manage file system storage

// Global pipeline instance (singleton)
let pipelineInstance: RAGPipeline | null = null

export async function initializeApp(): Promise<void> {
  console.log('Initializing app...')

  // Bootstrap strategies and log in development
  if (import.meta.env.DEV) {
    logRegisteredStrategies()
  }

  // Initialize pipeline
  pipelineInstance = new RAGPipeline(undefined, { debug: import.meta.env.DEV })

  // Validate configuration
  const validation = pipelineInstance.validateConfig()
  if (!validation.valid) {
    console.error('⚠️ Invalid pipeline configuration:', validation.errors)
  } else {
    console.log('✅ Pipeline configuration validated')
  }

  // Always use the default model - clear any old localStorage
  const oldModelId = localStorage.getItem('selectedModelId')
  if (oldModelId && oldModelId !== DEFAULT_MODEL_ID) {
    console.log(`🔄 Model changed from ${oldModelId} to ${DEFAULT_MODEL_ID}, clearing ALL caches...`)

    // Clear ALL caches when model changes (synchronously wait for it)
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((name) => name.includes('transformers') || name.includes('huggingface'))
          .map((name) => {
            console.log(`Deleting cache: ${name}`)
            return caches.delete(name)
          })
      )
    }

    // Clear localStorage cache status
    localStorage.removeItem('model-cache-status')
    console.log('✅ All caches cleared')
  }
  localStorage.setItem('selectedModelId', DEFAULT_MODEL_ID)

  // Check if models are already cached (will be false if model changed)
  const { hasCache } = await checkModelCache()

  if (hasCache) {
    // Models are cached, set progress to 100% immediately
    console.log('✅ Models found in cache, loading instantly...')
    modelProgressTracker.updateGeneration(100)
    modelProgressTracker.updateEmbedding(100)

    // Only initialize embedding model (generation disabled)
    await initEmbeddingModel()

    return
  }

  console.log('🚀 Downloading models for first time...')

  // Preload embedding model only (generation model disabled for now)
  // CRITICAL: Await this so loading screen stays visible until models are ready

  // Mark generation as complete immediately (disabled)
  modelProgressTracker.updateGeneration(100)

  await initEmbeddingModel((progress) => {
    // Convert progress (0-1 or status string) to percentage
    let percent = 0
    if (typeof progress.progress === 'number') {
      percent = progress.progress * 100
    } else if (progress.status === 'downloading' || progress.status === 'download') {
      percent = 50
    } else if (progress.status === 'loading') {
      percent = 10
    }
    modelProgressTracker.updateEmbedding(percent)
  }).then(() => {
    console.log('✅ Embedding model (MiniLM) ready')
    modelProgressTracker.updateEmbedding(100)
  })

  console.log('✅ All models loaded and cached')
  // Mark models as cached for next time
  markModelsCached()
}

/**
 * Get the global pipeline instance
 */
export function getPipeline(): RAGPipeline {
  if (!pipelineInstance) {
    pipelineInstance = new RAGPipeline()
  }
  return pipelineInstance
}
