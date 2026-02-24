import type { RetrievalStrategy, RetrievalResult } from './RetrievalStrategy'
import type { ConfigSchema, StrategyConfig } from '../types'
import type { Chunk, LexicalIndex, VectorIndex } from '../../types'
import { buildLexicalIndex, search as bm25Search } from '../../index_lex/bm25'
import { buildVectorIndex, semanticSearch } from '../../index_vec/vectorIndex'
import { loadLexicalIndex, saveLexicalIndex } from '../../storage/indexCache'
import { normalizeScores } from '../../rank/normalize'

/**
 * Hybrid retrieval combining BM25 and semantic search
 *
 * Combines keyword and semantic search with configurable weighting.
 * Wraps the existing hybrid search logic from core/rank/search.ts
 */
export class HybridRetriever implements RetrievalStrategy {
  readonly id = 'hybrid'
  readonly name = 'Hybrid (BM25 + Semantic)'
  readonly description = 'Combine keyword and semantic search with adjustable weighting'
  readonly requiresEmbeddings = true

  readonly configSchema: ConfigSchema = {
    fields: [
      {
        key: 'topK',
        label: 'Top K Results',
        type: 'slider',
        default: 10,
        min: 1,
        max: 30,
        step: 1,
        description: 'Number of chunks to retrieve',
      },
      {
        key: 'alpha',
        label: 'Semantic Weight (α)',
        type: 'slider',
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
        description: 'Weight for semantic search (0=lexical only, 1=semantic only)',
      },
    ],
  }

  private lexicalIndex: LexicalIndex | null = null

  async retrieve(
    query: string,
    chunks: Chunk[],
    config: StrategyConfig
  ): Promise<RetrievalResult> {
    const topK = config.topK ?? 10
    const alpha = config.alpha ?? 0.5

    // Build or load lexical index
    if (!this.lexicalIndex) {
      this.lexicalIndex = await loadLexicalIndex()
      if (!this.lexicalIndex) {
        this.lexicalIndex = buildLexicalIndex(chunks)
        await saveLexicalIndex(this.lexicalIndex)
      }
    }

    // Build vector index
    const vectorIndex = await buildVectorIndex(chunks)
    const chunksMap = new Map(chunks.map((c) => [c.id, c]))

    // Get results from both methods (full list for proper normalization)
    const lexicalResults = bm25Search(query, this.lexicalIndex, chunksMap, chunks.length)
    const semanticResults = await semanticSearch(query, vectorIndex, chunksMap, chunks.length)

    // Normalize scores to 0-1 range
    const lexicalMap = normalizeScores(lexicalResults)
    const semanticMap = normalizeScores(semanticResults)

    // Combine scores with alpha weighting
    const combinedScores = new Map<string, number>()
    const allChunkIds = new Set([...lexicalMap.keys(), ...semanticMap.keys()])

    for (const chunkId of allChunkIds) {
      const lexScore = lexicalMap.get(chunkId) || 0
      const semScore = semanticMap.get(chunkId) || 0
      const combined = alpha * semScore + (1 - alpha) * lexScore
      combinedScores.set(chunkId, combined)
    }

    // Sort and get topK
    const results = Array.from(combinedScores.entries())
      .map(([chunkId, score]) => ({
        chunk: chunksMap.get(chunkId)!,
        score,
      }))
      .filter((r) => r.chunk)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    return {
      chunks: results.map((r) => r.chunk),
      scores: results.map((r) => r.score),
      metadata: {
        algorithm: 'Hybrid',
        alpha,
        lexicalCount: lexicalResults.length,
        semanticCount: semanticResults.length,
      },
    }
  }

  async buildIndex(chunks: Chunk[]): Promise<void> {
    this.lexicalIndex = buildLexicalIndex(chunks)
    await saveLexicalIndex(this.lexicalIndex)
  }

  isIndexReady(): boolean {
    return this.lexicalIndex !== null
  }
}

// Auto-register this strategy
import { RetrievalRegistry } from './RetrievalStrategy'
RetrievalRegistry.register(new HybridRetriever())
