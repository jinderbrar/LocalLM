import type { RAGConfig } from '../config/types'
import type { SearchQuery, SearchResult, Page, Chunk, Doc, Citation } from '../types'
import type { IngestResult, PipelineOptions } from './types'
import { ConfigManager } from '../config/ConfigManager'
import { ChunkingRegistry } from '../strategies/chunking'
import { EmbeddingRegistry } from '../strategies/embedding'
import { RetrievalRegistry } from '../strategies/retrieval'
import { GenerationRegistry } from '../strategies/generation'
import { PostProcessRegistry } from '../strategies/postprocess'
import { ingestFile } from '../ingest'
import { saveDoc, saveChunk, getAllChunks, getDoc, saveVector, saveFileBlob } from '../storage/db'
import { saveLexicalIndex } from '../storage/indexCache'
import { buildLexicalIndex } from '../index_lex'
import { debugLogger } from '../debug'
import { queryLatencyTracker } from '../perf/latency'

/**
 * Main RAG pipeline orchestrator
 *
 * Coordinates all stages of the RAG pipeline using configured strategies.
 */
export class RAGPipeline {
  private config: RAGConfig
  private options: PipelineOptions

  constructor(config?: RAGConfig, options: PipelineOptions = {}) {
    this.config = config || ConfigManager.getConfig()
    this.options = options

    if (this.options.debug) {
      console.log('🔧 RAGPipeline initialized with config:', this.config)
    }
  }

  /**
   * Get current pipeline configuration
   */
  getConfig(): RAGConfig {
    return this.config
  }

  /**
   * Update pipeline configuration
   */
  setConfig(config: RAGConfig): void {
    this.config = config
    if (this.options.debug) {
      console.log('🔧 RAGPipeline config updated:', this.config)
    }
  }

  /**
   * Ingest a document into the pipeline
   *
   * Stages:
   * 1. Extract pages (PDF/TXT/MD)
   * 2. Chunk with selected strategy
   * 3. Embed with selected strategy
   * 4. Store in database
   *
   * @param file - File to ingest
   * @param onProgress - Optional progress callback
   * @returns Document ID and metadata
   */
  async ingest(
    file: File,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<IngestResult> {
    const startTime = performance.now()

    try {
      // Stage 1: Extract pages
      onProgress?.('Parsing file...', 0.1)
      const { doc, pages } = await ingestFile(file)

      // Stage 2: Chunk with configured strategy
      onProgress?.('Chunking text...', 0.3)
      const chunkingStrategy = ChunkingRegistry.get(this.config.chunking.strategyId)
      if (!chunkingStrategy) {
        throw new Error(`Chunking strategy not found: ${this.config.chunking.strategyId}`)
      }

      const chunks = await chunkingStrategy.chunk(pages, this.config.chunking.config)

      if (this.options.debug) {
        console.log(`📄 Chunked into ${chunks.length} chunks using ${chunkingStrategy.name}`)
      }

      // Stage 3: Save document and chunks
      onProgress?.('Saving document...', 0.4)
      await saveDoc(doc)

      // Save original file blob for PDF preview
      if (doc.type === 'pdf') {
        await saveFileBlob(doc.id, file)
      }

      onProgress?.('Saving chunks...', 0.5)
      for (const chunk of chunks) {
        await saveChunk(chunk)
      }

      // Stage 4: Embed with configured strategy
      onProgress?.(`Generating embeddings (${chunks.length} chunks)...`, 0.6)
      const embeddingStrategy = EmbeddingRegistry.get(this.config.embedding.strategyId)
      if (!embeddingStrategy) {
        throw new Error(`Embedding strategy not found: ${this.config.embedding.strategyId}`)
      }

      if (!embeddingStrategy.isReady()) {
        await embeddingStrategy.initialize(this.config.embedding.config)
      }

      // Generate embeddings for all chunks
      const texts = chunks.map((c) => c.text)
      const embeddings = await embeddingStrategy.embedBatch(texts)

      if (this.options.debug) {
        console.log(
          `🔢 Generated ${embeddings.length} embeddings using ${embeddingStrategy.name}`
        )
      }

      // Save embeddings
      onProgress?.('Saving embeddings...', 0.8)
      for (let i = 0; i < chunks.length; i++) {
        await saveVector(chunks[i].id, embeddings[i])
      }

      // Update document status
      doc.status.indexedVector = true
      await saveDoc(doc)

      // Stage 5: Rebuild lexical index for all documents
      onProgress?.('Building search index...', 0.9)
      const allChunks = await getAllChunks()
      const lexicalIndex = buildLexicalIndex(allChunks)
      await saveLexicalIndex(lexicalIndex)

      // Update all documents' lexical index status
      doc.status.indexedLexical = true
      await saveDoc(doc)

      const duration = performance.now() - startTime

      onProgress?.('Complete!', 1.0)

      if (this.options.debug) {
        console.log(`✅ Ingestion complete in ${duration.toFixed(0)}ms`)
      }

      return {
        docId: doc.id,
        chunkCount: chunks.length,
        duration,
      }
    } catch (error) {
      console.error('❌ Ingestion failed:', error)
      throw error
    }
  }

  /**
   * Query the pipeline for answers
   *
   * Stages:
   * 1. Retrieve with selected strategy
   * 2. Generate answer with selected strategy
   * 3. Post-process with configured strategies
   * 4. Return result
   *
   * @param query - Search query
   * @returns Search result with answer
   */
  async query(query: SearchQuery): Promise<SearchResult> {
    const startTime = performance.now()

    try {
      // Start debug logging
      const queryId = debugLogger.startQuery(
        query.text,
        query.mode || this.config.retrieval.strategyId,
        query.chatMode || 'search'
      )

      // Stage 1: Retrieve with configured strategy
      const retrievalStrategyId = query.mode || this.config.retrieval.strategyId
      const retrievalStrategy = RetrievalRegistry.get(retrievalStrategyId)

      if (!retrievalStrategy) {
        throw new Error(`Retrieval strategy not found: ${retrievalStrategyId}`)
      }

      debugLogger.logRetrievalStart(
        retrievalStrategyId,
        query.topK || 10,
        query.alpha
      )

      const retrievalStart = performance.now()
      const chunks = await getAllChunks()

      // Build retrieval config from query
      const retrievalConfig = {
        topK: query.topK || 10,
        alpha: query.alpha,
        ...this.config.retrieval.config,
      }

      const retrievalResult = await retrievalStrategy.retrieve(
        query.text,
        chunks,
        retrievalConfig
      )

      const retrievalTime = performance.now() - retrievalStart

      // Build citations
      const citations: Citation[] = []
      for (let i = 0; i < retrievalResult.chunks.length; i++) {
        const chunk = retrievalResult.chunks[i]
        const doc = await getDoc(chunk.docId)
        if (doc) {
          citations.push({
            chunkId: chunk.id,
            docId: chunk.docId,
            docName: doc.name,
            pageNumber: chunk.pageNumber,
            text: chunk.text,
            score: retrievalResult.scores[i],
          })
        }
      }

      debugLogger.logRetrievalComplete(
        {
          mode: retrievalStrategyId,
          topK: query.topK || 10,
          alpha: query.alpha,
          resultsCount: citations.length,
          chunks: citations.map((c) => ({
            id: c.chunkId,
            text: c.text,
            score: c.score || 0,
            docName: c.docName,
            pageNumber: c.pageNumber,
          })),
        },
        retrievalTime
      )

      // Stage 2: Generate answer (if in chat mode)
      let generatedAnswer: string | undefined = undefined
      let generationTime = 0
      let polishTime = 0

      if (query.chatMode === 'chat' && citations.length > 0) {
        debugLogger.logGenerationStart()

        const generationStart = performance.now()
        const generationStrategy = GenerationRegistry.get(this.config.generation.strategyId)

        if (!generationStrategy) {
          throw new Error(
            `Generation strategy not found: ${this.config.generation.strategyId}`
          )
        }

        if (!generationStrategy.isReady()) {
          await generationStrategy.initialize(this.config.generation.config)
        }

        const generationResult = await generationStrategy.generate(
          query.text,
          retrievalResult.chunks.slice(0, 5),
          this.config.generation.config
        )

        generatedAnswer = generationResult.answer
        generationTime = performance.now() - generationStart

        debugLogger.logGenerationComplete(
          {
            answer: generatedAnswer,
            answerLength: generatedAnswer.length,
          },
          generationTime
        )

        // Stage 3: Post-process answer (if enabled)
        for (const ppConfig of this.config.postProcess) {
          if (ppConfig.config.enabled) {
            const ppStrategy = PostProcessRegistry.get(ppConfig.strategyId)
            if (ppStrategy) {
              debugLogger.logPolishStart(generatedAnswer)
              const polishStart = performance.now()

              generatedAnswer = await ppStrategy.process(
                generatedAnswer,
                query.text,
                retrievalResult.chunks,
                ppConfig.config
              )

              polishTime = performance.now() - polishStart
              debugLogger.logPolishComplete(generatedAnswer, polishTime)
            }
          }
        }
      }

      const totalTime = performance.now() - startTime

      // Track latency
      queryLatencyTracker.record(totalTime)

      // Log query completion
      debugLogger.logQueryComplete(totalTime)

      return {
        chunks: retrievalResult.chunks,
        citations,
        scores: retrievalResult.scores,
        latency: {
          retrieval: retrievalTime,
          generation: generationTime > 0 ? generationTime : undefined,
          polish: polishTime > 0 ? polishTime : undefined,
          total: totalTime,
        },
        generatedAnswer,
      }
    } catch (error) {
      debugLogger.logError(error instanceof Error ? error : String(error), {
        context: 'query',
      })
      throw error
    }
  }

  /**
   * Validate that all configured strategies are available
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check chunking strategy
    if (!ChunkingRegistry.has(this.config.chunking.strategyId)) {
      errors.push(`Chunking strategy not found: ${this.config.chunking.strategyId}`)
    }

    // Check embedding strategy
    if (!EmbeddingRegistry.has(this.config.embedding.strategyId)) {
      errors.push(`Embedding strategy not found: ${this.config.embedding.strategyId}`)
    }

    // Check retrieval strategy
    if (!RetrievalRegistry.has(this.config.retrieval.strategyId)) {
      errors.push(`Retrieval strategy not found: ${this.config.retrieval.strategyId}`)
    }

    // Check generation strategy
    if (!GenerationRegistry.has(this.config.generation.strategyId)) {
      errors.push(`Generation strategy not found: ${this.config.generation.strategyId}`)
    }

    // Check post-process strategies
    for (const pp of this.config.postProcess) {
      if (!PostProcessRegistry.has(pp.strategyId)) {
        errors.push(`Post-process strategy not found: ${pp.strategyId}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}
