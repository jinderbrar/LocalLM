import { pipeline, env } from '@xenova/transformers'

// Configure for browser environment
env.allowLocalModels = false
env.useBrowserCache = true

let embeddingPipeline: any = null

export async function initEmbeddingModel(): Promise<void> {
  if (embeddingPipeline) return

  embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: true,
  })
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
