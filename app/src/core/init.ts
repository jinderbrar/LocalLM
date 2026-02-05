import { initGenerationModel, DEFAULT_MODEL_ID } from './generate'
import { env } from '@xenova/transformers'

// Configure Transformers.js
env.allowRemoteModels = true
env.allowLocalModels = false

// Models are cached in browser Cache Storage automatically
// No need to manage file system storage

export async function initializeApp(): Promise<void> {
  console.log('Initializing app...')

  // Get user's preferred model from localStorage
  const selectedModelId = localStorage.getItem('selectedModelId') || DEFAULT_MODEL_ID

  // Start model download in background (don't await - let it load async)
  initGenerationModel(selectedModelId).catch((error) => {
    console.warn('Failed to preload generation model:', error)
  })

  console.log(`App initialization started (loading ${selectedModelId} in background)`)
}
