import type { Chunk } from '../../types'
import type { ConfigSchema, StrategyConfig } from '../types'

/**
 * Result from a generation strategy
 */
export interface GenerationResult {
  answer: string
  confidence?: number
  metadata?: Record<string, any>
}

/**
 * Interface for answer generation strategies
 */
export interface GenerationStrategy {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly type: 'extractive' | 'generative' | 'hybrid'
  readonly configSchema: ConfigSchema

  /**
   * Initialize the generation model
   */
  initialize(config: StrategyConfig): Promise<void>

  /**
   * Generate answer from question and retrieved chunks
   */
  generate(
    question: string,
    chunks: Chunk[],
    config: StrategyConfig
  ): Promise<GenerationResult>

  /**
   * Check if model is loaded and ready
   */
  isReady(): boolean
}

/**
 * Registry for generation strategies
 */
export class GenerationRegistry {
  private static strategies = new Map<string, GenerationStrategy>()

  static register(strategy: GenerationStrategy): void {
    this.strategies.set(strategy.id, strategy)
  }

  static get(id: string): GenerationStrategy | undefined {
    return this.strategies.get(id)
  }

  static getAll(): GenerationStrategy[] {
    return Array.from(this.strategies.values())
  }

  static has(id: string): boolean {
    return this.strategies.has(id)
  }
}
