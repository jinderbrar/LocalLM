import type { Page, Chunk } from '../../types'
import type { ConfigSchema, StrategyConfig } from '../types'

/**
 * Interface for document chunking strategies
 */
export interface ChunkingStrategy {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly configSchema: ConfigSchema

  /**
   * Chunk pages into smaller pieces
   */
  chunk(pages: Page[], config: StrategyConfig): Promise<Chunk[]>

  /**
   * Estimate number of chunks for given text (for UI preview)
   */
  estimateChunks(text: string, config: StrategyConfig): number
}

/**
 * Registry for chunking strategies
 */
export class ChunkingRegistry {
  private static strategies = new Map<string, ChunkingStrategy>()

  static register(strategy: ChunkingStrategy): void {
    this.strategies.set(strategy.id, strategy)
  }

  static get(id: string): ChunkingStrategy | undefined {
    return this.strategies.get(id)
  }

  static getAll(): ChunkingStrategy[] {
    return Array.from(this.strategies.values())
  }

  static has(id: string): boolean {
    return this.strategies.has(id)
  }
}
