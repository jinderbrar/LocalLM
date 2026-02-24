/**
 * Verification script for Phase 2
 *
 * Run this to verify all strategies are registered correctly
 */

import './bootstrap'
import {
  ChunkingRegistry,
  EmbeddingRegistry,
  RetrievalRegistry,
  GenerationRegistry,
  PostProcessRegistry,
} from './index'
import { ConfigManager } from '../config/ConfigManager'

export function verifyPhase2() {
  console.log('🔍 Phase 2 Verification\n')

  let totalStrategies = 0
  let errors: string[] = []

  // Check Chunking
  const chunkingStrategies = ChunkingRegistry.getAll()
  console.log(`✅ Chunking Strategies (${chunkingStrategies.length}):`)
  chunkingStrategies.forEach((s) => {
    console.log(`   - ${s.id}: ${s.name}`)
    console.log(`     Fields: ${s.configSchema.fields.map((f) => f.key).join(', ')}`)
  })
  totalStrategies += chunkingStrategies.length

  if (chunkingStrategies.length === 0) {
    errors.push('No chunking strategies registered')
  }

  // Check Embedding
  const embeddingStrategies = EmbeddingRegistry.getAll()
  console.log(`\n✅ Embedding Strategies (${embeddingStrategies.length}):`)
  embeddingStrategies.forEach((s) => {
    console.log(`   - ${s.id}: ${s.name} (${s.dimensions}d, ${s.modelSize})`)
    console.log(`     Fields: ${s.configSchema.fields.map((f) => f.key).join(', ')}`)
  })
  totalStrategies += embeddingStrategies.length

  if (embeddingStrategies.length === 0) {
    errors.push('No embedding strategies registered')
  }

  // Check Retrieval
  const retrievalStrategies = RetrievalRegistry.getAll()
  console.log(`\n✅ Retrieval Strategies (${retrievalStrategies.length}):`)
  retrievalStrategies.forEach((s) => {
    console.log(
      `   - ${s.id}: ${s.name} (embeddings: ${s.requiresEmbeddings ? 'yes' : 'no'})`
    )
    console.log(`     Fields: ${s.configSchema.fields.map((f) => f.key).join(', ')}`)
  })
  totalStrategies += retrievalStrategies.length

  if (retrievalStrategies.length === 0) {
    errors.push('No retrieval strategies registered')
  }

  // Check Generation
  const generationStrategies = GenerationRegistry.getAll()
  console.log(`\n✅ Generation Strategies (${generationStrategies.length}):`)
  generationStrategies.forEach((s) => {
    console.log(`   - ${s.id}: ${s.name} (${s.type})`)
    console.log(`     Fields: ${s.configSchema.fields.map((f) => f.key).join(', ')}`)
  })
  totalStrategies += generationStrategies.length

  if (generationStrategies.length === 0) {
    errors.push('No generation strategies registered')
  }

  // Check Post-Processing
  const postProcessStrategies = PostProcessRegistry.getAll()
  console.log(`\n✅ Post-Processing Strategies (${postProcessStrategies.length}):`)
  postProcessStrategies.forEach((s) => {
    console.log(`   - ${s.id}: ${s.name}`)
    console.log(`     Fields: ${s.configSchema.fields.map((f) => f.key).join(', ')}`)
  })
  totalStrategies += postProcessStrategies.length

  // Check Configuration
  console.log('\n📋 Current Configuration:')
  const config = ConfigManager.getConfig()
  console.log(`   Chunking: ${config.chunking.strategyId}`)
  console.log(`   Embedding: ${config.embedding.strategyId}`)
  console.log(`   Retrieval: ${config.retrieval.strategyId}`)
  console.log(`   Generation: ${config.generation.strategyId}`)
  console.log(
    `   Post-Process: ${config.postProcess.map((p) => p.strategyId).join(', ') || 'none'}`
  )

  // Validate configuration
  console.log('\n🔍 Validating Configuration:')
  const validationErrors: string[] = []

  if (!ChunkingRegistry.has(config.chunking.strategyId)) {
    validationErrors.push(`Chunking strategy not found: ${config.chunking.strategyId}`)
  } else {
    console.log(`   ✓ Chunking strategy '${config.chunking.strategyId}' exists`)
  }

  if (!EmbeddingRegistry.has(config.embedding.strategyId)) {
    validationErrors.push(`Embedding strategy not found: ${config.embedding.strategyId}`)
  } else {
    console.log(`   ✓ Embedding strategy '${config.embedding.strategyId}' exists`)
  }

  if (!RetrievalRegistry.has(config.retrieval.strategyId)) {
    validationErrors.push(`Retrieval strategy not found: ${config.retrieval.strategyId}`)
  } else {
    console.log(`   ✓ Retrieval strategy '${config.retrieval.strategyId}' exists`)
  }

  if (!GenerationRegistry.has(config.generation.strategyId)) {
    validationErrors.push(`Generation strategy not found: ${config.generation.strategyId}`)
  } else {
    console.log(`   ✓ Generation strategy '${config.generation.strategyId}' exists`)
  }

  for (const pp of config.postProcess) {
    if (!PostProcessRegistry.has(pp.strategyId)) {
      validationErrors.push(`Post-process strategy not found: ${pp.strategyId}`)
    } else {
      console.log(`   ✓ Post-process strategy '${pp.strategyId}' exists`)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log(`📊 Total Strategies Registered: ${totalStrategies}`)
  console.log(
    `   Expected: 10 (1 chunking + 1 embedding + 3 retrieval + 4 generation + 1 post-process)`
  )
  console.log('='.repeat(60))

  if (errors.length > 0) {
    console.log('\n❌ Errors:')
    errors.forEach((e) => console.log(`   - ${e}`))
  }

  if (validationErrors.length > 0) {
    console.log('\n⚠️ Configuration Validation Errors:')
    validationErrors.forEach((e) => console.log(`   - ${e}`))
  }

  if (errors.length === 0 && validationErrors.length === 0 && totalStrategies === 10) {
    console.log('\n✅ Phase 2 Complete! All strategies registered and validated.')
    return true
  } else {
    console.log('\n❌ Phase 2 verification failed. Please check errors above.')
    return false
  }
}

// Auto-run if executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  verifyPhase2()
}
