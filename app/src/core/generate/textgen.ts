import { pipeline } from '@xenova/transformers'
import { getModelById, DEFAULT_MODEL_ID } from './models'
import { debugLogger } from '../debug'
import { getCustomPrompt, buildPromptFromTemplate } from '../debug/prompts'
import { getBestDevice } from '../deviceDetection'

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

    // Detect best device (WebGPU or WASM)
    const device = await getBestDevice()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`🚀 Loading Generation Model: ${modelConfig.name}`)
    console.log(`📦 Model Size: ${modelConfig.size}`)
    console.log(`🎮 Device: ${device === 'webgpu' ? 'GPU (WebGPU)' : 'CPU (WASM)'}`)
    console.log(`🔧 Precision: fp32 (full precision for stability)`)
    console.log(`⚡ Expected Speed: ${device === 'webgpu' ? '5-10 seconds' : '10-20 seconds'}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    let lastProgress = 0
    // Load model with progress tracking
    // NOTE: Gemma 3 has issues with fp16/q4 on WebGPU, so we use fp32 (unquantized)
    const pipelineOptions: any = {
      device, // Use WebGPU if available, fallback to WASM
      dtype: 'fp32', // Use fp32 for Gemma 3 (q4 causes overflow on WebGPU)
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
    }

    // Load the model with the configured options
    generationPipeline = await pipeline(task, modelConfig.modelPath, pipelineOptions)

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
  maxTokens: number = 150
): Promise<string> {
  // DISABLED: Generative models not currently supported
  throw new Error('Generative answer generation is currently disabled. T5/Gemma models are not supported in this build.')

  /* eslint-disable no-unreachable */
  try {
    const startTime = performance.now()
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

    // Build instruction prompt for Gemma 3
    const messages = [
      { role: 'user', content: `Answer this question based on the context provided.\n\nContext: ${context.slice(0, 2000)}\n\nQuestion: ${question}\n\nAnswer concisely:` }
    ]

    // Apply chat template using tokenizer
    const prompt = generationPipeline.tokenizer.apply_chat_template(messages, {
      tokenize: false,
      add_generation_prompt: true,
    })

    console.log('📝 Prompt:', prompt.substring(0, 200) + '...')

    // Log prompt sent
    debugLogger.logPromptSent({
      modelId: currentModelId || DEFAULT_MODEL_ID,
      modelType: 'gemma-3',
      prompt,
      promptLength: prompt.length,
      maxTokens: 150,
      temperature: 0.3,
    })

    // Generate with reasonable settings for speed
    const result = await generationPipeline(prompt, {
      max_new_tokens: 150,
      temperature: 0.3,
      top_p: 0.9,
      do_sample: false, // Greedy decoding for speed
      repetition_penalty: 1.2,
      return_full_text: false,
    })

    const endTime = performance.now()
    const duration = Math.round(endTime - startTime)
    console.log(`⚡ Generation completed in ${duration}ms`)
    console.log('📦 Raw result:', result)

    // Extract generated text
    let answer = ''
    if (Array.isArray(result)) {
      answer = result[0]?.generated_text || ''
    } else {
      answer = (result as any)?.generated_text || ''
    }

    // Clean up common artifacts
    answer = answer.trim()
    answer = answer.replace(/^Answer:\s*/i, '')
    answer = answer.replace(/^A:\s*/i, '')

    console.log('✨ Final answer:', answer)

    if (!answer || answer.length < 3) {
      return 'Unable to generate a clear answer from the context.'
    }

    return answer
  } catch (error) {
    console.error('Generation error:', error)

    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return 'Generation took too long. Try a simpler question or refresh the page.'
      }
      if (error.message.includes('out of memory') || error.message.includes('OOM')) {
        return 'Out of memory. Try closing other tabs or using a shorter document.'
      }
    }

    return `Error: ${error instanceof Error ? error.message : 'Generation failed. Please try again.'}`
  }
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
  // DISABLED: Just return the extractive answer without polishing
  console.log('⚠️ Answer polishing disabled (T5 models not supported)')
  return extractiveAnswer

  /* eslint-disable no-unreachable */
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
    const resultAny = result as any
    let polished = ''
    if (Array.isArray(resultAny)) {
      polished = resultAny[0]?.generated_text || resultAny[0]?.text || ''
    } else {
      polished = resultAny?.generated_text || resultAny?.text || ''
    }
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
