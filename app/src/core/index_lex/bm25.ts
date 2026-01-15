import type { Chunk, LexicalIndex } from '../types'
import { tokenize, computeTermFrequency } from './tokenizer'

// BM25 parameters
const K1 = 1.5 // term frequency saturation parameter
const B = 0.75 // length normalization parameter

export function buildLexicalIndex(chunks: Chunk[]): LexicalIndex {
  const docFreq = new Map<string, number>()
  const termFreq = new Map<string, Map<string, number>>()
  const chunkIds: string[] = []

  let totalLength = 0

  // Build term frequency and document frequency
  for (const chunk of chunks) {
    const tokens = tokenize(chunk.text)
    const tf = computeTermFrequency(tokens)

    chunkIds.push(chunk.id)
    termFreq.set(chunk.id, tf)
    totalLength += tokens.length

    // Count documents containing each term
    const uniqueTerms = new Set(tokens)
    for (const term of uniqueTerms) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1)
    }
  }

  const avgDocLength = chunks.length > 0 ? totalLength / chunks.length : 0

  return {
    docFreq,
    termFreq,
    chunkIds,
    avgDocLength,
  }
}

export function computeBM25Score(
  query: string,
  chunkId: string,
  index: LexicalIndex
): number {
  const queryTokens = tokenize(query)
  const chunkTF = index.termFreq.get(chunkId)

  if (!chunkTF) return 0

  let score = 0
  const N = index.chunkIds.length

  // Calculate chunk length
  let chunkLength = 0
  for (const freq of chunkTF.values()) {
    chunkLength += freq
  }

  for (const term of queryTokens) {
    const tf = chunkTF.get(term) || 0
    const df = index.docFreq.get(term) || 0

    if (df === 0) continue

    // IDF component
    const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1)

    // TF component with length normalization
    const lengthNorm = 1 - B + B * (chunkLength / index.avgDocLength)
    const tfComponent = (tf * (K1 + 1)) / (tf + K1 * lengthNorm)

    score += idf * tfComponent
  }

  return score
}

export function search(
  query: string,
  index: LexicalIndex,
  chunksMap: Map<string, Chunk>,
  topK: number = 10
): Array<{ chunk: Chunk; score: number }> {
  const scores: Array<{ chunk: Chunk; score: number }> = []

  for (const chunkId of index.chunkIds) {
    const score = computeBM25Score(query, chunkId, index)
    const chunk = chunksMap.get(chunkId)

    if (chunk && score > 0) {
      scores.push({ chunk, score })
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  return scores.slice(0, topK)
}
