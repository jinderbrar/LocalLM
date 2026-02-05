import { pipeline } from '@xenova/transformers'
import { getModelById, DEFAULT_MODEL_ID } from './models'
import { debugLogger } from '../debug'
import { getCustomPrompt, buildPromptFromTemplate } from '../debug/prompts'

let generationPipeline: any = null
let currentModelId: string | null = null
let isInitializing = false

export type ProgressCallback = (progress: { status: string; progress?: number }) => void

export async function initGenerationModel(
  modelId: string = DEFAULT_MODEL_ID,
  onProgress?: ProgressCallback
): Promise<void> {
  // If same model is already loaded, skip
  if (generationPipeline && currentModelId === modelId) {
    return
  }

  // If initializing, wait
  if (isInitializing) {
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return
  }

  isInitializing = true
  try {
    const modelConfig = getModelById(modelId)
    if (!modelConfig) {
      throw new Error(`Model ${modelId} not found`)
    }

    console.log(`Loading ${modelConfig.name} (${modelConfig.size})...`)
    onProgress?.({ status: 'loading', progress: 0.1 })

    // Use the task specified in model config
    const task = modelConfig.task

    console.log(`Task type: ${task}, Model path: ${modelConfig.modelPath}`)

    let lastProgress = 0
    // Load model with progress tracking
    generationPipeline = await pipeline(task, modelConfig.modelPath, {
      progress_callback: (progress: any) => {

        // Avoid flooding with too many updates
        const percent =
          progress && typeof progress.progress === 'number'
            ? progress.progress / 100
            : undefined
        if (percent !== undefined) {
          if (percent - lastProgress < 0.05 && percent < 0.99) {
            return
          }
          lastProgress = percent
        }

        console.log('Model download progress:', progress)

        // Progress can have different formats
        if (progress.status === 'progress' && progress.file) {
          // File download progress
          const percent = progress.progress || 0
          onProgress?.({ status: 'downloading', progress: percent / 100 })
        } else if (progress.status === 'done') {
          onProgress?.({ status: 'ready', progress: 0.95 })
        } else if (progress.status === 'ready') {
          onProgress?.({ status: 'ready', progress: 1 })
        } else {
          // Generic progress update
          onProgress?.({ status: 'downloading', progress: 0.5 })
        }
      },
    })

    currentModelId = modelId
    console.log(`${modelConfig.name} loaded successfully ✓`)
    onProgress?.({ status: 'ready', progress: 1 })
  } catch (error) {
    console.error('Model initialization error:', error)
    isInitializing = false
    throw error
  } finally {
    isInitializing = false
  }
}

export function getCurrentModelId(): string | null {
  return currentModelId
}

export function isModelLoaded(): boolean {
  return generationPipeline !== null
}

export async function generateAnswer(
  question: string,
  context: string,
  maxLength: number = 450
): Promise<string> {
  try {
    console.log('🔍 generateAnswer called', {
      hasModel: !!generationPipeline,
      currentModel: currentModelId,
      question: question.substring(0, 50),
    })

    if (!generationPipeline) {
      console.log('⚠️ Model not loaded, initializing now...')
      await initGenerationModel()
      console.log('✅ Model initialized')
    }

    const modelConfig = getModelById(currentModelId || DEFAULT_MODEL_ID)
    if (!modelConfig) {
      throw new Error('Model config not found')
    }

    const task = modelConfig.task
    console.log('🚀 Starting with task:', task)

    // Handle question-answering task (extractive QA)
    if (task === 'question-answering') {
      console.log('📝 Question:', question)
      console.log('📚 Context length:', context.length)

      const result = await generationPipeline(question, context, {
        top_k: 3, // Get top 3 answers
      })

      console.log('📦 QA result:', result)

      // QA returns: { answer, score, start, end } or array of answers
      if (Array.isArray(result)) {
        const bestAnswer = result[0]
        return bestAnswer?.answer || 'No answer found in the context.'
      }

      return result?.answer || 'No answer found in the context.'
    }

    // Handle text generation tasks (T5, GPT, etc.)
    const modelType = getModelType(currentModelId || '')
    const prompt = buildPrompt(modelType, question, context)

    console.log('📝 Prompt:', prompt.substring(0, 200) + '...')

    // Log prompt sent
    debugLogger.logPromptSent({
      modelId: currentModelId || DEFAULT_MODEL_ID,
      modelType,
      prompt,
      promptLength: prompt.length,
      maxTokens: maxLength,
      temperature: 0.3,
    })

    const result = await generationPipeline(prompt, {
      max_new_tokens: maxLength,
      temperature: 0.3,
      top_p: 0.95,
      do_sample: true,
      repetition_penalty: 1.2,
      return_full_text: false,
    })

    console.log('📦 Raw generation result:', result)

    // Extract and clean generated text
    let generatedText = extractGeneratedText(result)
    generatedText = cleanOutput(generatedText, prompt, modelType)

    console.log('✨ Final cleaned answer:', generatedText)

    return generatedText || 'Unable to generate a clear answer from the context.'
  } catch (error) {
    console.error('Generation error:', error)
    return `Error: ${error instanceof Error ? error.message : 'Generation failed'}`
  }
}

function getModelType(modelId: string): 'flan-t5' | 't5' | 'gpt' | 'unknown' {
  if (modelId.includes('flan-t5')) return 'flan-t5'
  if (modelId.includes('t5')) return 't5'
  if (modelId.includes('gpt')) return 'gpt'
  return 'unknown'
}

function normalize(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function chunkContext(context: string, maxChars = 1600) {
  const clean = normalize(context)
  // Cheap chunking: split sentences-ish. You can replace with real chunking later.
  const parts = clean.split(/(?<=[.?!])\s+/)
  const chunks: string[] = []
  let cur = ''

  for (const p of parts) {
    if ((cur + ' ' + p).length > maxChars) {
      if (cur) chunks.push(cur.trim())
      cur = p
    } else {
      cur += ' ' + p
    }
  }
  if (cur.trim()) chunks.push(cur.trim())
  return chunks.slice(0, 6) // cap number of chunks to keep prompt stable
}

function buildPrompt(modelType: string, question: string, context: string): string {
  // Check for custom prompt first
  const customPrompt = getCustomPrompt('generation')
  if (customPrompt) {
    // Use custom prompt with placeholders
    const chunks = chunkContext(context, 800)
    const numberedContext = chunks.map((c, i) => `[${i + 1}] ${c}`).join('\n')
    return buildPromptFromTemplate(customPrompt, {
      question: normalize(question),
      context: numberedContext,
    })
  }

  // Default prompts
  const q = normalize(question)
  const chunks = chunkContext(context, 800) // small chunks
  const numberedContext = chunks.map((c, i) => `[${i + 1}] ${c}`).join('\n')

  const groundingRules =
    `Rules:\n` +
    `- Use ONLY the context.\n` +
    `- If the answer is not in the context, reply exactly: NOT IN CONTEXT.\n` +
    `- Be brief (1-3 sentences).\n` +
    `- If you use context, include citations like [1][3].\n`

  switch (modelType) {
    case 'flan-t5':
      // Flan usually likes simple instruction + schema
      return (
        `${groundingRules}\n` +
        `Context:\n${numberedContext}\n\n` +
        `Question: ${q}\n` +
        `Answer:`
      )

    case 't5':
      // Keep it extremely consistent; minimal fluff
      return (
        `rules: use only context; if missing say NOT IN CONTEXT; cite like [1]. ` +
        `context: ${numberedContext} ` +
        `question: ${q} ` +
        `answer:`
      )

    case 'gpt':
      // Works better if you can use chat roles, but keeping your single string:
      return (
        `${groundingRules}\n` +
        `Context:\n${numberedContext}\n\n` +
        `Question: ${q}\n` +
        `Answer:`
      )

    default:
      return (
        `${groundingRules}\n` +
        `Context:\n${numberedContext}\n\n` +
        `Question: ${q}\n` +
        `Answer:`
      )
  }
}


function extractGeneratedText(result: any): string {
  if (Array.isArray(result)) {
    return result[0]?.generated_text || result[0]?.text || ''
  }
  return result?.generated_text || result?.text || ''
}

function cleanOutput(text: string, prompt: string, modelType: string): string {
  let cleaned = text.trim()

  console.log('🧹 Cleaning output. Original length:', cleaned.length)
  console.log('🧹 First 300 chars:', cleaned.substring(0, 300))

  // AGGRESSIVE: Remove exact prompt match
  if (cleaned.startsWith(prompt)) {
    cleaned = cleaned.slice(prompt.length).trim()
    console.log('✂️ Removed exact prompt. New length:', cleaned.length)
  }

  // AGGRESSIVE: Remove everything before "Answer:" (multiple variations)
  const answerMarkers = [
    'Answer:',
    'answer:',
    'Answer :',
    'A:',
    'Response:',
    'response:',
  ]

  for (const marker of answerMarkers) {
    const idx = cleaned.lastIndexOf(marker)
    if (idx !== -1) {
      cleaned = cleaned.slice(idx + marker.length).trim()
      console.log(`✂️ Removed text before "${marker}". New length:`, cleaned.length)
      break
    }
  }

  // AGGRESSIVE: Remove Rules/Context/Question sections that models echo
  const removePatterns = [
    /Rules:[\s\S]*?(?=Answer:|$)/gi,
    /Context:[\s\S]*?(?=Question:|Answer:|$)/gi,
    /Question:[\s\S]*?(?=Answer:|$)/gi,
    /\[\d+\][\s\S]*?(?=Question:|Answer:|$)/gi, // Remove numbered context citations
  ]

  for (const pattern of removePatterns) {
    const before = cleaned
    cleaned = cleaned.replace(pattern, '').trim()
    if (before !== cleaned) {
      console.log('✂️ Pattern removed. New length:', cleaned.length)
    }
  }

  // Remove common instruction echoes at start
  const badStarts = [
    'Use ONLY the context',
    'use only context',
    'If the answer is not in the context',
    'if missing say NOT IN CONTEXT',
    'Be brief',
    'cite like',
    'Based on the context',
    'According to the context',
  ]

  for (const bad of badStarts) {
    if (cleaned.toLowerCase().startsWith(bad.toLowerCase())) {
      // Find the first sentence after this
      const sentences = cleaned.split(/[.!?]+/)
      if (sentences.length > 1) {
        cleaned = sentences.slice(1).join('. ').trim()
        console.log('✂️ Removed instruction echo. New length:', cleaned.length)
      }
    }
  }

  // Remove numbered citations that aren't part of the answer
  cleaned = cleaned.replace(/^\[\d+\]\s*/g, '')

  // AGGRESSIVE: If output still contains "Context:" or "Question:", take only the part after "Answer:"
  if (cleaned.match(/Context:|Question:|Rules:/i)) {
    const parts = cleaned.split(/Answer:/i)
    if (parts.length > 1) {
      cleaned = parts[parts.length - 1].trim()
      console.log('✂️ Extracted answer portion. New length:', cleaned.length)
    }
  }

  // Remove line breaks that break up sentences
  cleaned = cleaned.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()

  // Remove excessive repetition
  const sentences = cleaned.split(/[.!?]+/).filter((s) => s.trim().length > 5)
  if (sentences.length > 2) {
    const uniqueSentences = []
    const seenNormalized = new Set()

    for (const sentence of sentences) {
      const normalized = sentence.trim().toLowerCase()
      if (normalized.length > 10 && !seenNormalized.has(normalized)) {
        uniqueSentences.push(sentence.trim())
        seenNormalized.add(normalized)
      }
    }

    if (uniqueSentences.length > 0) {
      cleaned = uniqueSentences.join('. ')
    }
  }

  // Ensure proper ending punctuation
  if (cleaned && !cleaned.match(/[.!?]$/)) {
    cleaned += '.'
  }

  console.log('✨ Final cleaned length:', cleaned.length)
  console.log('✨ Final output:', cleaned.substring(0, 200))

  return cleaned
}

export function formatContextFromChunks(
  chunks: Array<{ text: string; docName: string }>
): string {
  // Take top 3-5 most relevant chunks and format cleanly
  return chunks
    .slice(0, 5)
    .map((chunk, idx) => {
      // Clean up the chunk text
      const cleanText = chunk.text.trim().replace(/\s+/g, ' ')
      return `${cleanText}`
    })
    .join('\n\n')
    .slice(0, 1500) // Limit total context length
}

/**
 * Polish an extractive answer using flan-t5-small to make it more fluent and natural
 * @param extractiveAnswer The raw extractive answer to polish
 * @param question The original question for context
 * @returns Polished, more natural answer
 */
export async function polishAnswer(
  extractiveAnswer: string,
  question: string
): Promise<string> {
  try {
    console.log('✨ polishAnswer called', {
      question: question.substring(0, 50),
      extractive: extractiveAnswer.substring(0, 100),
    })

    // Load flan-t5-small specifically for polishing
    const polishModelId = 'flan-t5-small'
    const polishModel = await pipeline('text2text-generation', 'Xenova/flan-t5-small')

    // Check for custom polish prompt
    const customPolishPrompt = getCustomPrompt('polish')
    const polishPrompt = customPolishPrompt
      ? buildPromptFromTemplate(customPolishPrompt, {
          question,
          answer: extractiveAnswer,
        })
      : `Rephrase this answer to be more fluent and natural while keeping the same information:\n\n` +
        `Question: ${question}\n` +
        `Answer: ${extractiveAnswer}\n\n` +
        `Rephrased:`

    console.log('📝 Polish prompt:', polishPrompt)

    // Log polish prompt sent
    debugLogger.logPolishPromptSent(polishPrompt)

    const result = await polishModel(polishPrompt, {
      max_new_tokens: 200,
      temperature: 0.4,
      top_p: 0.9,
      do_sample: true,
      repetition_penalty: 1.3,
    })

    console.log('📦 Polish result:', result)

    // Extract and clean the polished text
    let polished = extractGeneratedText(result)
    polished = polished.trim()

    // Remove common artifacts
    polished = polished.replace(/^Rephrased:\s*/i, '')
    polished = polished.replace(/^Answer:\s*/i, '')

    // Ensure proper ending
    if (polished && !polished.match(/[.!?]$/)) {
      polished += '.'
    }

    console.log('✨ Polished answer:', polished)

    // If polishing failed or produced garbage, return original
    if (!polished || polished.length < 10 || polished.toLowerCase().includes('not in context')) {
      console.log('⚠️ Polishing failed, returning original')
      return extractiveAnswer
    }

    return polished
  } catch (error) {
    console.error('Polish error:', error)
    // On error, return the original extractive answer
    return extractiveAnswer
  }
}
