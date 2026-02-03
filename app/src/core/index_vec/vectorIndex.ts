import type { Chunk, VectorIndex } from '../types'
import { generateEmbedding, cosineSimilarity } from './embeddings'
import { getVector, saveVector } from '../storage/db'

export async function buildVectorIndex(chunks: Chunk[]): Promise<VectorIndex> {
  const embeddings = new Map<string, Float32Array>()
  let dimension = 0

  for (const chunk of chunks) {
    // Check if embedding already exists
    let embedding = await getVector(chunk.id)

    if (!embedding) {
      // Generate new embedding
      embedding = await generateEmbedding(chunk.text)
      await saveVector(chunk.id, embedding)
    }

    embeddings.set(chunk.id, embedding)
    if (dimension === 0) {
      dimension = embedding.length
    }
  }

  return { embeddings, dimension }
}

export async function semanticSearch(
  query: string,
  vectorIndex: VectorIndex,
  chunksMap: Map<string, Chunk>,
  topK: number = 10
): Promise<Array<{ chunk: Chunk; score: number }>> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query)

  const scores: Array<{ chunk: Chunk; score: number }> = []

  // Calculate cosine similarity for each chunk
  for (const [chunkId, chunkEmbedding] of vectorIndex.embeddings) {
    const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding)
    const chunk = chunksMap.get(chunkId)

    if (chunk) {
      scores.push({ chunk, score: similarity })
    }
  }

  // Sort by similarity descending
  scores.sort((a, b) => b.score - a.score)

  return scores.slice(0, topK)
}
