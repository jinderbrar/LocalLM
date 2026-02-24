import type { Chunk } from '../../types'
import type { ConfigSchema, StrategyConfig } from '../types'

/**
 * Interface for post-processing strategies (polish, re-rank, etc.)
 */
export interface PostProcessStrategy {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly configSchema: ConfigSchema

  /**
   * Process the generated answer
   */
  process(
    answer: string,
    question: string,
    chunks: Chunk[],
    config: StrategyConfig
  ): Promise<string>

  /**
   * Optional: Initialize any models needed for processing
   */
  initialize?(config: StrategyConfig): Promise<void>

  /**
   * Optional: Check if ready to process
   */
  isReady?(): boolean
}

/**
 * Registry for post-processing strategies
 */
export class PostProcessRegistry {
  private static strategies = new Map<string, PostProcessStrategy>()

  static register(strategy: PostProcessStrategy): void {
    this.strategies.set(strategy.id, strategy)
  }

  static get(id: string): PostProcessStrategy | undefined {
    return this.strategies.get(id)
  }

  static getAll(): PostProcessStrategy[] {
    return Array.from(this.strategies.values())
  }

  static has(id: string): boolean {
    return this.strategies.has(id)
  }
}
