/**
 * Debug logging system for tracking the complete search/generation pipeline
 */

export type DebugEventType =
  | 'query_start'
  | 'retrieval_start'
  | 'retrieval_complete'
  | 'context_built'
  | 'generation_start'
  | 'prompt_sent'
  | 'generation_complete'
  | 'polish_start'
  | 'polish_prompt_sent'
  | 'polish_complete'
  | 'query_complete'
  | 'error'

export interface DebugEvent {
  id: string
  timestamp: number
  type: DebugEventType
  data: any
  duration?: number
}

export interface RetrievalDetails {
  mode: string
  topK: number
  alpha?: number
  resultsCount: number
  chunks: Array<{
    id: string
    text: string
    score: number
    docName: string
    pageNumber: number
  }>
}

export interface ContextDetails {
  contextLength: number
  contextPreview: string
  chunksUsed: number
}

export interface PromptDetails {
  modelId: string
  modelType: string
  prompt: string
  promptLength: number
  maxTokens?: number
  temperature?: number
}

export interface GenerationDetails {
  answer: string
  answerLength: number
  rawOutput?: string
}

class DebugLogger {
  private events: DebugEvent[] = []
  private listeners: Array<(events: DebugEvent[]) => void> = []
  private currentQueryId: string | null = null

  /**
   * Start a new query session
   */
  startQuery(query: string, mode: string, chatMode: string): string {
    const queryId = `query-${Date.now()}`
    this.currentQueryId = queryId
    this.addEvent({
      id: `${queryId}-start`,
      timestamp: Date.now(),
      type: 'query_start',
      data: { query, mode, chatMode, queryId },
    })
    return queryId
  }

  /**
   * Log retrieval start
   */
  logRetrievalStart(mode: string, topK: number, alpha?: number) {
    if (!this.currentQueryId) return
    this.addEvent({
      id: `${this.currentQueryId}-retrieval-start`,
      timestamp: Date.now(),
      type: 'retrieval_start',
      data: { mode, topK, alpha },
    })
  }

  /**
   * Log retrieval completion with results
   */
  logRetrievalComplete(details: RetrievalDetails, duration: number) {
    if (!this.currentQueryId) return
    this.addEvent({
      id: `${this.currentQueryId}-retrieval-complete`,
      timestamp: Date.now(),
      type: 'retrieval_complete',
      data: details,
      duration,
    })
  }

  /**
   * Log context building
   */
  logContextBuilt(details: ContextDetails) {
    if (!this.currentQueryId) return
    this.addEvent({
      id: `${this.currentQueryId}-context-built`,
      timestamp: Date.now(),
      type: 'context_built',
      data: details,
    })
  }

  /**
   * Log generation start
   */
  logGenerationStart() {
    if (!this.currentQueryId) return
    this.addEvent({
      id: `${this.currentQueryId}-generation-start`,
      timestamp: Date.now(),
      type: 'generation_start',
      data: {},
    })
  }

  /**
   * Log prompt sent to model
   */
  logPromptSent(details: PromptDetails) {
    if (!this.currentQueryId) return
    this.addEvent({
      id: `${this.currentQueryId}-prompt-sent`,
      timestamp: Date.now(),
      type: 'prompt_sent',
      data: details,
    })
  }

  /**
   * Log generation completion
   */
  logGenerationComplete(details: GenerationDetails, duration: number) {
    if (!this.currentQueryId) return
    this.addEvent({
      id: `${this.currentQueryId}-generation-complete`,
      timestamp: Date.now(),
      type: 'generation_complete',
      data: details,
      duration,
    })
  }

  /**
   * Log polish start
   */
  logPolishStart(extractiveAnswer: string) {
    if (!this.currentQueryId) return
    this.addEvent({
      id: `${this.currentQueryId}-polish-start`,
      timestamp: Date.now(),
      type: 'polish_start',
      data: { extractiveAnswer },
    })
  }

  /**
   * Log polish prompt
   */
  logPolishPromptSent(prompt: string) {
    if (!this.currentQueryId) return
    this.addEvent({
      id: `${this.currentQueryId}-polish-prompt-sent`,
      timestamp: Date.now(),
      type: 'polish_prompt_sent',
      data: { prompt, promptLength: prompt.length },
    })
  }

  /**
   * Log polish completion
   */
  logPolishComplete(polishedAnswer: string, duration: number) {
    if (!this.currentQueryId) return
    this.addEvent({
      id: `${this.currentQueryId}-polish-complete`,
      timestamp: Date.now(),
      type: 'polish_complete',
      data: { polishedAnswer, answerLength: polishedAnswer.length },
      duration,
    })
  }

  /**
   * Log query completion
   */
  logQueryComplete(totalDuration: number) {
    if (!this.currentQueryId) return
    this.addEvent({
      id: `${this.currentQueryId}-complete`,
      timestamp: Date.now(),
      type: 'query_complete',
      data: {},
      duration: totalDuration,
    })
    this.currentQueryId = null
  }

  /**
   * Log error
   */
  logError(error: Error | string, context?: any) {
    const errorData = {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context,
    }
    this.addEvent({
      id: `${this.currentQueryId || 'unknown'}-error-${Date.now()}`,
      timestamp: Date.now(),
      type: 'error',
      data: errorData,
    })
  }

  /**
   * Add event and notify listeners
   */
  private addEvent(event: DebugEvent) {
    this.events.push(event)
    // Keep only last 500 events to prevent memory issues
    if (this.events.length > 500) {
      this.events = this.events.slice(-500)
    }
    this.notifyListeners()
  }

  /**
   * Subscribe to debug events
   */
  subscribe(listener: (events: DebugEvent[]) => void): () => void {
    this.listeners.push(listener)
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners() {
    this.listeners.forEach((listener) => listener([...this.events]))
  }

  /**
   * Get all events
   */
  getEvents(): DebugEvent[] {
    return [...this.events]
  }

  /**
   * Clear all events
   */
  clear() {
    this.events = []
    this.currentQueryId = null
    this.notifyListeners()
  }

  /**
   * Get events for a specific query
   */
  getQueryEvents(queryId: string): DebugEvent[] {
    return this.events.filter((e) => e.id.startsWith(queryId))
  }
}

// Singleton instance
export const debugLogger = new DebugLogger()
