import type { Chunk } from '../../types'
import type { ConfigSchema, StrategyConfig } from '../types'

/**
 * Result from a retrieval strategy
 */
export interface RetrievalResult {
  chunks: Chunk[]
  scores: number[]
  metadata?: Record<string, any>
}

/**
 * Interface for retrieval strategies
 */
export interface RetrievalStrategy {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly requiresEmbeddings: boolean
  readonly configSchema: ConfigSchema

  /**
   * Retrieve relevant chunks for a query
   */
  retrieve(
    query: string,
    chunks: Chunk[],
    config: StrategyConfig
  ): Promise<RetrievalResult>

  /**
   * Optional: Build index for faster retrieval (e.g., BM25 index)
   */
  buildIndex?(chunks: Chunk[]): Promise<void>

  /**
   * Optional: Check if index is built and ready
   */
  isIndexReady?(): boolean
}

/**
 * Registry for retrieval strategies
 */
export class RetrievalRegistry {
  private static strategies = new Map<string, RetrievalStrategy>()

  static register(strategy: RetrievalStrategy): void {
    this.strategies.set(strategy.id, strategy)
  }

  static get(id: string): RetrievalStrategy | undefined {
    return this.strategies.get(id)
  }

  static getAll(): RetrievalStrategy[] {
    return Array.from(this.strategies.values())
  }

  static has(id: string): boolean {
    return this.strategies.has(id)
  }
}
