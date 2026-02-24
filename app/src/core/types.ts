// Core document types

export interface Doc {
  id: string
  name: string
  type: 'pdf' | 'txt' | 'md'
  size: number
  uploadedAt: number
  status: DocStatus
  metadata?: Record<string, unknown>
}

export interface DocStatus {
  parsed: boolean
  indexedLexical: boolean
  indexedVector: boolean
  error?: string
}

export interface Page {
  docId: string
  pageNumber: number
  text: string
  metadata?: Record<string, unknown>
}

export interface Chunk {
  id: string
  docId: string
  pageNumber: number
  text: string
  startOffset: number
  endOffset: number
  tokens?: number
  embedding?: Float32Array
}

export interface Citation {
  chunkId: string
  docId: string
  docName: string
  pageNumber: number
  text: string
  score?: number
}

// Search and retrieval types

export type SearchMode = 'bm25' | 'semantic' | 'hybrid'
export type ChatMode = 'search' | 'chat'

export interface SearchQuery {
  text: string
  mode: SearchMode
  topK?: number
  alpha?: number // for hybrid: semantic weight (0-1)
  chatMode?: ChatMode
  polish?: boolean // enable answer polishing with flan-t5
}

export interface SearchResult {
  chunks: Chunk[]
  citations: Citation[]
  scores: number[]
  latency: LatencyStats
  generatedAnswer?: string
}

export interface LatencyStats {
  embedding?: number
  retrieval: number
  generation?: number
  polish?: number
  total: number
}

// Index types

export interface LexicalIndex {
  docFreq: Map<string, number>
  termFreq: Map<string, Map<string, number>> // chunkId -> term -> freq
  chunkIds: string[]
  avgDocLength: number
}

export interface VectorIndex {
  embeddings: Map<string, Float32Array> // chunkId -> embedding
  dimension: number
}

// Note types

export interface Note {
  id: string
  title: string
  content: string
  citations: Citation[]
  createdAt: number
  updatedAt: number
}

// Study kit types

export interface StudyKit {
  docIds: string[]
  bullets: string[]
  flashcards: Flashcard[]
  quiz: QuizQuestion[]
}

export interface Flashcard {
  front: string
  back: string
  citation?: Citation
}

export interface QuizQuestion {
  question: string
  answer: string
  citation?: Citation
}

// Evaluation types

export interface BenchmarkQuery {
  id: string
  text: string
  relevantChunkIds: string[]
}

export interface EvalMetrics {
  mrr10: number
  ndcg10: number
  latencyP50: number
  latencyP95: number
}
