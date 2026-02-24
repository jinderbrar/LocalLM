import type { RetrievalStrategy, RetrievalResult } from './RetrievalStrategy'
import type { ConfigSchema, StrategyConfig } from '../types'
import type { Chunk, VectorIndex } from '../../types'
import { buildVectorIndex, semanticSearch } from '../../index_vec/vectorIndex'

/**
 * Semantic search retriever using embeddings
 *
 * Searches by meaning/context using vector similarity.
 * Wraps the existing semantic search implementation from core/index_vec/vectorIndex.ts
 */
export class SemanticRetriever implements RetrievalStrategy {
  readonly id = 'semantic'
  readonly name = 'Semantic (Vector)'
  readonly description = 'Search by meaning using embedding similarity'
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
    ],
  }

  async retrieve(
    query: string,
    chunks: Chunk[],
    config: StrategyConfig
  ): Promise<RetrievalResult> {
    const topK = config.topK ?? 10

    // Build vector index (will use cached embeddings)
    const vectorIndex = await buildVectorIndex(chunks)
    const chunksMap = new Map(chunks.map((c) => [c.id, c]))

    const results = await semanticSearch(query, vectorIndex, chunksMap, topK)

    return {
      chunks: results.map((r) => r.chunk),
      scores: results.map((r) => r.score),
      metadata: {
        algorithm: 'Semantic',
        dimension: vectorIndex.dimension,
        embeddingCount: vectorIndex.embeddings.size,
      },
    }
  }
}

// Auto-register this strategy
import { RetrievalRegistry } from './RetrievalStrategy'
RetrievalRegistry.register(new SemanticRetriever())
