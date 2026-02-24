import type { EmbeddingStrategy } from './EmbeddingStrategy'
import type { ConfigSchema, StrategyConfig } from '../types'
import {
  initEmbeddingModel,
  generateEmbedding,
  generateEmbeddings,
} from '../../index_vec/embeddings'

/**
 * MiniLM-L6-v2 embedding model
 *
 * Fast, lightweight embedding model optimized for browser usage.
 * Wraps the existing embeddings implementation from core/index_vec/embeddings.ts
 */
export class MiniLMEmbedder implements EmbeddingStrategy {
  readonly id = 'minilm-l6-v2'
  readonly name = 'MiniLM-L6-v2'
  readonly description = 'Fast and lightweight embedding model (384 dimensions, 23MB)'
  readonly dimensions = 384
  readonly modelSize = '23MB'

  readonly configSchema: ConfigSchema = {
    fields: [
      {
        key: 'batchSize',
        label: 'Batch Size',
        type: 'number',
        default: 1,
        min: 1,
        max: 10,
        description: 'Number of texts to process at once (currently sequential)',
      },
      {
        key: 'normalize',
        label: 'Normalize Embeddings',
        type: 'toggle',
        default: true,
        description: 'Apply L2 normalization to embeddings',
      },
    ],
  }

  private initialized = false

  async initialize(config: StrategyConfig): Promise<void> {
    if (this.initialized) return

    await initEmbeddingModel()
    this.initialized = true
  }

  async embed(text: string): Promise<Float32Array> {
    if (!this.initialized) {
      await this.initialize({})
    }

    return generateEmbedding(text)
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    if (!this.initialized) {
      await this.initialize({})
    }

    // Use existing batch implementation (sequential for now)
    return generateEmbeddings(texts)
  }

  isReady(): boolean {
    return this.initialized
  }
}

// Auto-register this strategy
import { EmbeddingRegistry } from './EmbeddingStrategy'
EmbeddingRegistry.register(new MiniLMEmbedder())
