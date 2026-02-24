import type { GenerationStrategy, GenerationResult } from './GenerationStrategy'
import type { ConfigSchema, StrategyConfig } from '../types'
import type { Chunk } from '../../types'

/**
 * Extractive QA generation using DistilBERT or RoBERTa
 *
 * Extracts answer spans directly from context.
 * Wraps the existing extractive QA implementation from core/generate/textgen.ts
 */
export class ExtractiveGenerator implements GenerationStrategy {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly type = 'extractive' as const

  private modelId: string

  readonly configSchema: ConfigSchema = {
    fields: [
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        type: 'slider',
        default: 200,
        min: 50,
        max: 500,
        step: 50,
        description: 'Maximum answer length (approximate)',
      },
    ],
  }

  constructor(modelId: string = 'distilbert-qa') {
    this.modelId = modelId
    this.id = `extractive-${modelId}`
    this.name = 'Simple Extractive'
    this.description = 'Extract relevant text directly from documents'
  }

  async initialize(config: StrategyConfig): Promise<void> {
    // No model initialization needed for simple extractive approach
    console.log('Extractive generator ready (simple text extraction)')
  }

  async generate(
    question: string,
    chunks: Chunk[],
    config: StrategyConfig
  ): Promise<GenerationResult> {
    const maxTokens = config.maxTokens || 200

    // Simple extractive approach: concatenate top chunks
    // TODO: Use proper QA model when Transformers.js supports it better
    const topChunks = chunks.slice(0, 3)

    if (topChunks.length === 0) {
      return {
        answer: 'No relevant information found in the documents.',
        metadata: {
          modelId: 'simple-extractive',
          modelType: 'extractive',
          chunksUsed: 0,
          contextLength: 0,
        },
      }
    }

    // Extract most relevant sentences from top chunks
    const answer = topChunks
      .map(chunk => {
        // Get first few sentences from chunk
        const sentences = chunk.text.split(/[.!?]+/).filter(s => s.trim().length > 20)
        return sentences.slice(0, 2).join('. ').trim()
      })
      .filter(text => text.length > 0)
      .join('. ')
      .slice(0, maxTokens * 4) // Rough token estimate

    // Ensure proper ending
    const finalAnswer = answer.match(/[.!?]$/) ? answer : answer + '.'

    return {
      answer: finalAnswer,
      metadata: {
        modelId: 'simple-extractive',
        modelType: 'extractive',
        chunksUsed: topChunks.length,
        contextLength: answer.length,
      },
    }
  }

  isReady(): boolean {
    // Simple extractive is always ready (no model needed)
    return true
  }
}

// Auto-register default extractive strategies
import { GenerationRegistry } from './GenerationStrategy'
GenerationRegistry.register(new ExtractiveGenerator('distilbert-qa'))
GenerationRegistry.register(new ExtractiveGenerator('roberta-qa'))
