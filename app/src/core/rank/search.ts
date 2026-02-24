import type { SearchQuery, SearchResult, Chunk, Citation } from '../types'
import { getAllChunks, getDoc } from '../storage/db'
import { loadLexicalIndex, saveLexicalIndex } from '../storage/indexCache'
import { buildLexicalIndex, search as bm25Search } from '../index_lex'
import { buildVectorIndex, semanticSearch } from '../index_vec'
import { queryLatencyTracker } from '../perf/latency'
import { normalizeScores } from './normalize'
import { generateAnswer, polishAnswer, formatContextFromChunks } from '../generate'
import { debugLogger } from '../debug'
import type { RetrievalDetails } from '../debug'

export async function executeSearch(query: SearchQuery): Promise<SearchResult> {
  const startTime = performance.now()

  // Start debug logging
  const queryId = debugLogger.startQuery(query.text, query.mode, query.chatMode || 'search')

  // Log retrieval start
  debugLogger.logRetrievalStart(query.mode, query.topK || 10, query.alpha)

  // Load chunks
  const chunks = await getAllChunks()
  const chunksMap = new Map(chunks.map((c) => [c.id, c]))

  // Load or build index
  let index = await loadLexicalIndex()
  if (!index) {
    index = buildLexicalIndex(chunks)
    await saveLexicalIndex(index)
  }

  // Execute search based on mode
  let results: Array<{ chunk: Chunk; score: number }> = []

  switch (query.mode) {
    case 'bm25':
      results = bm25Search(query.text, index, chunksMap, query.topK || 10)
      break
    case 'semantic': {
      const vectorIndex = await buildVectorIndex(chunks)
      results = await semanticSearch(query.text, vectorIndex, chunksMap, query.topK || 10)
      break
    }
    case 'hybrid': {
      // Hybrid: combine lexical and semantic scores
      const vectorIndex = await buildVectorIndex(chunks)
      const alpha = query.alpha !== undefined ? query.alpha : 0.5 // default 50/50

      const lexicalResults = bm25Search(query.text, index, chunksMap, chunks.length)
      const semanticResults = await semanticSearch(
        query.text,
        vectorIndex,
        chunksMap,
        chunks.length
      )

      // Normalize scores to 0-1 range
      const lexicalMap = normalizeScores(lexicalResults)
      const semanticMap = normalizeScores(semanticResults)

      // Combine scores with alpha weighting
      const combinedScores = new Map<string, number>()
      const allChunkIds = new Set([...lexicalMap.keys(), ...semanticMap.keys()])

      for (const chunkId of allChunkIds) {
        const lexScore = lexicalMap.get(chunkId) || 0
        const semScore = semanticMap.get(chunkId) || 0
        const combined = alpha * semScore + (1 - alpha) * lexScore
        combinedScores.set(chunkId, combined)
      }

      // Sort and get topK
      results = Array.from(combinedScores.entries())
        .map(([chunkId, score]) => ({
          chunk: chunksMap.get(chunkId)!,
          score,
        }))
        .filter((r) => r.chunk)
        .sort((a, b) => b.score - a.score)
        .slice(0, query.topK || 10)
      break
    }
  }

  // Build citations
  const citations: Citation[] = []
  for (const result of results) {
    const doc = await getDoc(result.chunk.docId)
    if (doc) {
      citations.push({
        chunkId: result.chunk.id,
        docId: result.chunk.docId,
        docName: doc.name,
        pageNumber: result.chunk.pageNumber,
        text: result.chunk.text,
        score: result.score,
      })
    }
  }

  const retrievalTime = performance.now() - startTime

  // Log retrieval completion
  const retrievalDetails: RetrievalDetails = {
    mode: query.mode,
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
  }
  debugLogger.logRetrievalComplete(retrievalDetails, retrievalTime)

  // Generate answer if in chat mode
  let generatedAnswer: string | undefined = undefined
  let generationTime = 0
  let polishTime = 0

  console.log('Chat mode check:', {
    chatMode: query.chatMode,
    citationsCount: citations.length,
    willGenerate: query.chatMode === 'chat' && citations.length > 0,
  })

  if (query.chatMode === 'chat' && citations.length > 0) {
    console.log('🤖 Starting answer generation...')
    debugLogger.logGenerationStart()
    try {
      const genStart = performance.now()
      const context = formatContextFromChunks(
        citations.slice(0, 5).map((c) => ({ text: c.text, docName: c.docName }))
      )
      console.log('Context for generation:', context.substring(0, 200) + '...')

      // Log context built
      debugLogger.logContextBuilt({
        contextLength: context.length,
        contextPreview: context.substring(0, 500),
        chunksUsed: Math.min(5, citations.length),
      })

      generatedAnswer = await generateAnswer(query.text, context)
      generationTime = performance.now() - genStart
      console.log('✅ Generation complete:', { answer: generatedAnswer, time: generationTime })

      // Log generation complete
      debugLogger.logGenerationComplete({
        answer: generatedAnswer,
        answerLength: generatedAnswer.length,
      }, generationTime)

      // Polish answer if enabled
      if (query.polish && generatedAnswer) {
        console.log('✨ Starting answer polishing...')
        debugLogger.logPolishStart(generatedAnswer)
        try {
          const polishStart = performance.now()
          const originalAnswer = generatedAnswer
          generatedAnswer = await polishAnswer(generatedAnswer, query.text)
          polishTime = performance.now() - polishStart
          console.log('✅ Polishing complete:', { polished: generatedAnswer, time: polishTime })

          // Log polish complete
          debugLogger.logPolishComplete(generatedAnswer, polishTime)
        } catch (error) {
          console.error('❌ Polishing failed:', error)
          debugLogger.logError(error instanceof Error ? error : String(error), { context: 'polish' })
          // Keep the original answer if polishing fails
        }
      }
    } catch (error) {
      console.error('❌ Generation failed:', error)
      debugLogger.logError(error instanceof Error ? error : String(error), { context: 'generation' })
      generatedAnswer = `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  } else {
    console.log('⏭️ Skipping generation (search mode or no results)')
  }

  const totalTime = performance.now() - startTime

  // Track latency
  queryLatencyTracker.record(totalTime)

  // Log query completion
  debugLogger.logQueryComplete(totalTime)

  return {
    chunks: results.map((r) => r.chunk),
    citations,
    scores: results.map((r) => r.score),
    latency: {
      retrieval: retrievalTime,
      generation: generationTime > 0 ? generationTime : undefined,
      polish: polishTime > 0 ? polishTime : undefined,
      total: totalTime,
    },
    generatedAnswer,
  }
}

export async function rebuildLexicalIndex(): Promise<void> {
  const chunks = await getAllChunks()
  const index = buildLexicalIndex(chunks)
  await saveLexicalIndex(index)
}
