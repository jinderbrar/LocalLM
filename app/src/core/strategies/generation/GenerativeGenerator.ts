import type { GenerationStrategy, GenerationResult } from './GenerationStrategy'
import type { ConfigSchema, StrategyConfig } from '../types'
import type { Chunk } from '../../types'
import {
  initGenerationModel,
  generateAnswer,
  formatContextFromChunks,
  isModelLoaded,
} from '../../generate/textgen'
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../../generate/models'

/**
 * Generative answer generation using Gemma 3 model
 *
 * Generates natural language answers synthesized from context.
 * Wraps the existing generative model implementation from core/generate/textgen.ts
 */
export class GenerativeGenerator implements GenerationStrategy {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly type = 'generative' as const

  private modelId: string

  readonly configSchema: ConfigSchema = {
    fields: [
      {
        key: 'modelId',
        label: 'Model',
        type: 'select',
        default: DEFAULT_MODEL_ID,
        options: AVAILABLE_MODELS.map((m) => ({
          label: `${m.name} (${m.size})`,
          value: m.id,
        })),
        description: 'Generative model to use',
      },
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        type: 'slider',
        default: 450,
        min: 100,
        max: 500,
        step: 50,
        description: 'Maximum answer length in tokens',
      },
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'slider',
        default: 0.3,
        min: 0,
        max: 1,
        step: 0.1,
        description: 'Sampling temperature (lower = more focused)',
      },
    ],
  }

  constructor(modelId: string = DEFAULT_MODEL_ID) {
    this.modelId = modelId
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId)
    this.id = `${modelId}`
    this.name = model?.name || 'Generative QA'
    this.description = model?.description || 'Generate natural language answers'
  }

  async initialize(config: StrategyConfig): Promise<void> {
    const modelId = config.modelId || this.modelId
    await initGenerationModel(modelId)
  }

  async generate(
    question: string,
    chunks: Chunk[],
    config: StrategyConfig
  ): Promise<GenerationResult> {
    const modelId = config.modelId || this.modelId
    const maxTokens = config.maxTokens || 300

    // Ensure model is loaded
    if (!isModelLoaded()) {
      await initGenerationModel(modelId)
    }

    // Format context from chunks
    const context = formatContextFromChunks(
      chunks.slice(0, 5).map((c) => ({ text: c.text, docName: c.docId }))
    )

    // Generate answer using existing implementation
    const answer = await generateAnswer(question, context, maxTokens)

    return {
      answer,
      metadata: {
        modelId,
        modelType: 'generative',
        chunksUsed: Math.min(5, chunks.length),
        contextLength: context.length,
      },
    }
  }

  isReady(): boolean {
    return isModelLoaded()
  }
}

// Auto-register generative strategy with default model
// DISABLED: T5/Gemma models not working with current Transformers.js version
// import { GenerationRegistry } from './GenerationStrategy'
// GenerationRegistry.register(new GenerativeGenerator(DEFAULT_MODEL_ID))
