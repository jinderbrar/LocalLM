#!/usr/bin/env node
import { pipeline } from '@xenova/transformers'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const modelPath = path.join(__dirname, '..', 'public', 'models')

console.log('Downloading flan-t5-small model for offline use...')
console.log('Model will be saved to:', modelPath)

// Create models directory if it doesn't exist
if (!fs.existsSync(modelPath)) {
  fs.mkdirSync(modelPath, { recursive: true })
}

// Configure transformers to use local path
process.env.TRANSFORMERS_CACHE = modelPath

try {
  // Download the model by initializing the pipeline
  const generator = await pipeline('text2text-generation', 'Xenova/flan-t5-small', {
    cache_dir: modelPath,
  })

  console.log('✓ Model downloaded successfully!')
  console.log('Model files are cached in:', modelPath)
  console.log('\nThe model will now be available offline.')
} catch (error) {
  console.error('Failed to download model:', error)
  process.exit(1)
}
