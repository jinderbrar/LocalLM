import type { ConfigSchema, StrategyConfig } from '../types'

/**
 * Interface for embedding strategies
 */
export interface EmbeddingStrategy {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly dimensions: number
  readonly modelSize: string // e.g., "23MB", "150MB"
  readonly configSchema: ConfigSchema

  /**
   * Initialize the embedding model
   */
  initialize(config: StrategyConfig): Promise<void>

  /**
   * Generate embedding for a single text
   */
  embed(text: string): Promise<Float32Array>

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  embedBatch(texts: string[]): Promise<Float32Array[]>

  /**
   * Check if model is loaded and ready
   */
  isReady(): boolean
}

/**
 * Registry for embedding strategies
 */
export class EmbeddingRegistry {
  private static strategies = new Map<string, EmbeddingStrategy>()

  static register(strategy: EmbeddingStrategy): void {
    this.strategies.set(strategy.id, strategy)
  }

  static get(id: string): EmbeddingStrategy | undefined {
    return this.strategies.get(id)
  }

  static getAll(): EmbeddingStrategy[] {
    return Array.from(this.strategies.values())
  }

  static has(id: string): boolean {
    return this.strategies.has(id)
  }
}
