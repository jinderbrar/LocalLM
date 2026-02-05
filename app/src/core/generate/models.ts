
export interface ModelConfig {
  id: string
  name: string
  size: string
  description: string
  modelPath: string
  strengths: string[]
  task: 'question-answering' | 'text2text-generation' | 'text-generation'
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'distilbert-qa',
    name: 'DistilBERT QA',
    size: '250MB',
    description: 'Fast extractive QA from documents',
    modelPath: 'Xenova/distilbert-base-cased-distilled-squad',
    strengths: ['Fast', 'Accurate'],
    task: 'question-answering',
  },
  {
    id: 'roberta-qa',
    name: 'RoBERTa QA',
    size: '450MB',
    description: 'High accuracy document QA',
    modelPath: 'Xenova/roberta-base-squad2',
    strengths: ['Best accuracy', 'Extractive'],
    task: 'question-answering',
  },
  {
    id: 'flan-t5-small',
    name: 'Flan-T5 Small',
    size: '80MB',
    description: 'Generative answers',
    modelPath: 'Xenova/flan-t5-small',
    strengths: ['Fast', 'Generative'],
    task: 'text2text-generation',
  },
  {
    id: 'flan-t5-base',
    name: 'Flan-T5 Base',
    size: '250MB',
    description: 'Better generative QA',
    modelPath: 'Xenova/flan-t5-base',
    strengths: ['Quality', 'Detailed'],
    task: 'text2text-generation',
  },
]

export const DEFAULT_MODEL_ID = 'distilbert-qa'

export function getModelById(id: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === id)
}
