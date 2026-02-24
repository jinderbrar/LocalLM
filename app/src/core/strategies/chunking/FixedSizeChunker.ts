import type { ChunkingStrategy } from './ChunkingStrategy'
import type { ConfigSchema, StrategyConfig } from '../types'
import type { Page, Chunk } from '../../types'
import { chunkPages } from '../../chunk/chunker'

/**
 * Fixed-size chunking with overlap and smart boundary detection
 *
 * Wraps the existing chunker implementation from core/chunk/chunker.ts
 */
export class FixedSizeChunker implements ChunkingStrategy {
  readonly id = 'fixed-size'
  readonly name = 'Fixed Size Chunking'
  readonly description = 'Split text into fixed-size chunks with overlap and smart sentence boundaries'

  readonly configSchema: ConfigSchema = {
    fields: [
      {
        key: 'chunkSize',
        label: 'Chunk Size (characters)',
        type: 'slider',
        default: 400,
        min: 100,
        max: 1000,
        step: 50,
        description: 'Target size for each chunk (~4 chars per token)',
      },
      {
        key: 'overlapPercent',
        label: 'Overlap (%)',
        type: 'slider',
        default: 12,
        min: 0,
        max: 30,
        step: 2,
        description: 'Percentage of overlap between consecutive chunks',
      },
    ],
  }

  async chunk(pages: Page[], config: StrategyConfig): Promise<Chunk[]> {
    const chunkSize = config.chunkSize ?? 400
    const overlapPercent = config.overlapPercent ?? 12

    // Use existing chunker implementation
    return chunkPages(pages, { chunkSize, overlapPercent })
  }

  estimateChunks(text: string, config: StrategyConfig): number {
    const chunkSize = config.chunkSize ?? 400
    const overlapPercent = config.overlapPercent ?? 12
    const overlapSize = Math.floor(chunkSize * (overlapPercent / 100))
    const effectiveChunkSize = chunkSize - overlapSize

    return Math.ceil(text.length / effectiveChunkSize)
  }
}

// Auto-register this strategy
import { ChunkingRegistry } from './ChunkingStrategy'
ChunkingRegistry.register(new FixedSizeChunker())
