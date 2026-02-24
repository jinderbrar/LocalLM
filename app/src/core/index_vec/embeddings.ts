import { pipeline, env } from '@xenova/transformers'
import { getBestDevice } from '../deviceDetection'

// Configure for browser environment
env.allowLocalModels = false
env.useBrowserCache = true

let embeddingPipeline: any = null

export async function initEmbeddingModel(
  onProgress?: (progress: { status: string; progress?: number }) => void
): Promise<void> {
  if (embeddingPipeline) return

  onProgress?.({ status: 'loading', progress: 0.1 })

  // Detect best device (WebGPU or WASM)
  const device = await getBestDevice()

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 Loading Embedding Model: MiniLM-L6-v2')
  console.log('📦 Model Size: ~23MB')
  console.log(`🎮 Device: ${device === 'webgpu' ? 'GPU (WebGPU)' : 'CPU (WASM)'}`)
  console.log(`🔧 Quantization: Q4 (4-bit)`)
  console.log(`⚡ Expected Speed: ${device === 'webgpu' ? 'Very Fast (GPU)' : 'Fast (CPU)'}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  let lastProgress = 0
  embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    device, // Use WebGPU if available, fallback to WASM
    dtype: 'q4', // Always use Q4 (4-bit) quantization for both GPU and CPU
    quantized: true, // Force quantization
    progress_callback: (progress: any) => {
      // Avoid flooding with too many updates
      const percent =
        progress && typeof progress.progress === 'number' ? progress.progress / 100 : undefined
      if (percent !== undefined) {
        if (percent - lastProgress < 0.05 && percent < 0.99) {
          return
        }
        lastProgress = percent
      }

      console.log('Embedding model progress:', progress)

      if (progress.status === 'progress' && progress.file) {
        const percent = progress.progress || 0
        onProgress?.({ status: 'downloading', progress: percent / 100 })
      } else if (progress.status === 'done' || progress.status === 'ready') {
        onProgress?.({ status: 'ready', progress: 1 })
      }
    },
  })

  console.log('Embedding model loaded ✓')
  onProgress?.({ status: 'ready', progress: 1 })
}

export async function generateEmbedding(text: string): Promise<Float32Array> {
  if (!embeddingPipeline) {
    await initEmbeddingModel()
  }

  const output = await embeddingPipeline(text, {
    pooling: 'mean',
    normalize: true,
  })

  return new Float32Array(output.data)
}

export async function generateEmbeddings(texts: string[]): Promise<Float32Array[]> {
  if (!embeddingPipeline) {
    await initEmbeddingModel()
  }

  const embeddings: Float32Array[] = []

  for (const text of texts) {
    const embedding = await generateEmbedding(text)
    embeddings.push(embedding)
  }

  return embeddings
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimension')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
