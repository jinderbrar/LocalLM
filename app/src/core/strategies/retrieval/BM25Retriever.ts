import type { RetrievalStrategy, RetrievalResult } from './RetrievalStrategy'
import type { ConfigSchema, StrategyConfig } from '../types'
import type { Chunk, LexicalIndex } from '../../types'
import { buildLexicalIndex, search as bm25Search } from '../../index_lex/bm25'
import { loadLexicalIndex, saveLexicalIndex } from '../../storage/indexCache'

/**
 * BM25 lexical search retriever
 *
 * Fast keyword-based search using BM25 ranking algorithm.
 * Wraps the existing BM25 implementation from core/index_lex/bm25.ts
 */
export class BM25Retriever implements RetrievalStrategy {
  readonly id = 'bm25'
  readonly name = 'BM25 (Lexical)'
  readonly description = 'Fast keyword-based search using BM25 algorithm'
  readonly requiresEmbeddings = false

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

  private index: LexicalIndex | null = null

  async retrieve(
    query: string,
    chunks: Chunk[],
    config: StrategyConfig
  ): Promise<RetrievalResult> {
    const topK = config.topK ?? 10

    // Build or load index
    if (!this.index) {
      this.index = await loadLexicalIndex()
      if (!this.index) {
        this.index = buildLexicalIndex(chunks)
        await saveLexicalIndex(this.index)
      }
    }

    const chunksMap = new Map(chunks.map((c) => [c.id, c]))
    const results = bm25Search(query, this.index, chunksMap, topK)

    return {
      chunks: results.map((r) => r.chunk),
      scores: results.map((r) => r.score),
      metadata: {
        algorithm: 'BM25',
        indexSize: this.index.chunkIds.length,
      },
    }
  }

  async buildIndex(chunks: Chunk[]): Promise<void> {
    this.index = buildLexicalIndex(chunks)
    await saveLexicalIndex(this.index)
  }

  isIndexReady(): boolean {
    return this.index !== null
  }
}

// Auto-register this strategy
import { RetrievalRegistry } from './RetrievalStrategy'
RetrievalRegistry.register(new BM25Retriever())
