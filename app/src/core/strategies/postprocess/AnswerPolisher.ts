import type { PostProcessStrategy } from './PostProcessStrategy'
import type { ConfigSchema, StrategyConfig } from '../types'
import type { Chunk } from '../../types'
import { polishAnswer } from '../../generate/textgen'

/**
 * Answer polisher using Flan-T5
 *
 * Improves answer fluency and naturalness while preserving information.
 * Wraps the existing polishAnswer implementation from core/generate/textgen.ts
 */
export class AnswerPolisher implements PostProcessStrategy {
  readonly id = 'polish'
  readonly name = 'Answer Polishing'
  readonly description = 'Improve answer fluency using Flan-T5-Small'

  readonly configSchema: ConfigSchema = {
    fields: [
      {
        key: 'enabled',
        label: 'Enable Polishing',
        type: 'toggle',
        default: false,
        description: 'Polish answers to make them more natural and fluent',
      },
    ],
  }

  async process(
    answer: string,
    question: string,
    chunks: Chunk[],
    config: StrategyConfig
  ): Promise<string> {
    const enabled = config.enabled ?? false

    if (!enabled) {
      return answer
    }

    // Skip polishing for error messages or very short answers
    if (
      answer.toLowerCase().includes('error') ||
      answer.toLowerCase().includes('not in context') ||
      answer.length < 20
    ) {
      return answer
    }

    try {
      // Use existing polish implementation
      const polished = await polishAnswer(answer, question)
      return polished
    } catch (error) {
      console.error('Polishing error:', error)
      // Return original on error
      return answer
    }
  }
}

// Auto-register this strategy
import { PostProcessRegistry } from './PostProcessStrategy'
PostProcessRegistry.register(new AnswerPolisher())
