
export interface ModelConfig {
  id: string
  name: string
  size: string
  description: string
  modelPath: string
  strengths: string[]
  task: 'text-generation' | 'text2text-generation' | 'question-answering'
  quantized?: boolean
}

// Single model configuration - Flan-T5-Base for fast generative QA
export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'flan-t5-base',
    name: 'Flan-T5 Base',
    size: '~250MB',
    description: 'Fast generative question answering',
    modelPath: 'Xenova/flan-t5-base',
    strengths: ['Fast', 'Natural', 'Instruction-tuned'],
    task: 'text-generation',
    quantized: true,
  },
]

export const DEFAULT_MODEL_ID = 'flan-t5-base'

export function getModelById(id: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === id)
}
