import type { Chunk } from '../types'

export function normalizeScores(
  results: Array<{ chunk: Chunk; score: number }>
): Map<string, number> {
  if (results.length === 0) return new Map()

  const scores = results.map((r) => r.score)
  const minScore = Math.min(...scores)
  const maxScore = Math.max(...scores)
  const range = maxScore - minScore

  const normalized = new Map<string, number>()

  for (const result of results) {
    // Normalize to 0-1 range
    const normalizedScore = range > 0 ? (result.score - minScore) / range : 1
    normalized.set(result.chunk.id, normalizedScore)
  }

  return normalized
}
