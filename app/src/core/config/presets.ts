import type { ConfigPreset } from './types'

/**
 * Predefined configuration presets for different use cases
 */
export const PRESETS: Record<string, ConfigPreset> = {
  fast: {
    id: 'fast',
    name: 'Fast',
    description: 'Optimized for speed with BM25 lexical search and fast models',
    icon: 'zap',
    config: {
      chunking: {
        strategyId: 'fixed-size',
        config: {
          chunkSize: 500,
          overlapPercent: 10,
        },
      },
      embedding: {
        strategyId: 'minilm-l6-v2',
        config: {
          batchSize: 1,
          normalize: true,
        },
      },
      retrieval: {
        strategyId: 'bm25',
        config: {
          topK: 5,
        },
      },
      generation: {
        strategyId: 'extractive-distilbert-qa',
        config: {
          maxTokens: 150,
        },
      },
      postProcess: [],
    },
  },

  balanced: {
    id: 'balanced',
    name: 'Balanced',
    description: 'Balance between speed and accuracy with hybrid search',
    icon: 'target',
    config: {
      chunking: {
        strategyId: 'fixed-size',
        config: {
          chunkSize: 400,
          overlapPercent: 12,
        },
      },
      embedding: {
        strategyId: 'minilm-l6-v2',
        config: {
          batchSize: 1,
          normalize: true,
        },
      },
      retrieval: {
        strategyId: 'hybrid',
        config: {
          topK: 10,
          alpha: 0.5,
        },
      },
      generation: {
        strategyId: 'extractive-distilbert-qa',
        config: {
          maxTokens: 200,
        },
      },
      postProcess: [
        {
          strategyId: 'polish',
          config: {
            enabled: true,
          },
        },
      ],
    },
  },

  accurate: {
    id: 'accurate',
    name: 'Accurate',
    description: 'Best quality with semantic search and answer polishing',
    icon: 'brain',
    config: {
      chunking: {
        strategyId: 'fixed-size',
        config: {
          chunkSize: 300,
          overlapPercent: 15,
        },
      },
      embedding: {
        strategyId: 'minilm-l6-v2',
        config: {
          batchSize: 1,
          normalize: true,
        },
      },
      retrieval: {
        strategyId: 'hybrid',
        config: {
          topK: 15,
          alpha: 0.7, // More weight on semantic
        },
      },
      generation: {
        strategyId: 'extractive-roberta-qa',
        config: {
          maxTokens: 250,
        },
      },
      postProcess: [
        {
          strategyId: 'polish',
          config: {
            enabled: true,
          },
        },
      ],
    },
  },
}

/**
 * Get all available presets
 */
export function getAllPresets(): ConfigPreset[] {
  return Object.values(PRESETS)
}

/**
 * Get a preset by ID
 */
export function getPreset(id: string): ConfigPreset | undefined {
  return PRESETS[id]
}

/**
 * Check if a preset exists
 */
export function hasPreset(id: string): boolean {
  return id in PRESETS
}
