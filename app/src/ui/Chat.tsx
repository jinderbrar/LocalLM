import { useState, useEffect, useRef } from 'react'
import { executeSearch } from '../core/rank'
import { getAllDocs } from '../core/storage/db'
import { getLatencyStats } from '../core/perf/latency'
import {
  initGenerationModel,
  getCurrentModelId,
  DEFAULT_MODEL_ID,
  getModelById,
} from '../core/generate'
import type { SearchResult, SearchMode, ChatMode } from '../core/types'
import ModelSelector from './ModelSelector'
import ModelLoadingOverlay from './ModelLoadingOverlay'
import './Chat.css'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  text: string
  result?: SearchResult
  timestamp: number
}

interface MessageState {
  [messageId: string]: {
    showAllSources: boolean
  }
}

function Chat() {
  const [query, setQuery] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('hybrid')
  const [chatMode, setChatMode] = useState<ChatMode>('chat')
  const [alpha, setAlpha] = useState(0.5) // For hybrid: semantic weight
  const [polish, setPolish] = useState(false) // For answer polishing
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageState, setMessageState] = useState<MessageState>({})
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasDocuments, setHasDocuments] = useState(false)
  const [showPerf, setShowPerf] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [currentModelId, setCurrentModelId] = useState<string>(
    localStorage.getItem('selectedModelId') || DEFAULT_MODEL_ID
  )
  const [loadingModel, setLoadingModel] = useState<{
    modelName: string
    status: string
    progress?: number
  } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const toggleShowAllSources = (messageId: string) => {
    setMessageState((prev) => ({
      ...prev,
      [messageId]: {
        showAllSources: !prev[messageId]?.showAllSources,
      },
    }))
  }

  const handleModelChange = async (newModelId: string) => {
    const modelConfig = getModelById(newModelId)
    if (!modelConfig) return

    setLoadingModel({
      modelName: modelConfig.name,
      status: 'loading',
      progress: 0,
    })

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Model loading timeout')
      setLoadingModel(null)
      setError(`Timeout loading ${modelConfig.name}. Check console for errors.`)
    }, 120000) // 2 minute timeout

    try {
      await initGenerationModel(newModelId, (progress) => {
        console.log('Progress update:', progress)
        setLoadingModel({
          modelName: modelConfig.name,
          status: progress.status,
          progress: progress.progress,
        })
      })

      clearTimeout(timeoutId)
      setCurrentModelId(newModelId)
      localStorage.setItem('selectedModelId', newModelId)

      // Hide loading after a brief delay
      setTimeout(() => {
        setLoadingModel(null)
      }, 800)
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Failed to load model:', error)
      setError(`Failed to load ${modelConfig.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setLoadingModel(null)
    }
  }

  useEffect(() => {
    checkDocuments()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function checkDocuments() {
    const docs = await getAllDocs()
    setHasDocuments(docs.length > 0)
  }

  async function handleSearch() {
    if (!query.trim()) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: query,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setQuery('')
    setSearching(true)
    setError(null)

    try {
      const searchResult = await executeSearch({
        text: userMessage.text,
        mode: searchMode,
        topK: 5,
        alpha: searchMode === 'hybrid' ? alpha : undefined,
        chatMode,
        polish: chatMode === 'chat' ? polish : undefined,
      })

      const assistantText =
        chatMode === 'chat' && searchResult.generatedAnswer
          ? searchResult.generatedAnswer
          : `Found ${searchResult.citations.length} results`

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        text: assistantText,
        result: searchResult,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        text: `Error: ${err instanceof Error ? err.message : 'Search failed'}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setSearching(false)
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="chat">
      <div className="chat-header">
        <h2>Chat</h2>
        <div className="header-controls">
          <div className="chat-mode-toggle">
            <button
              className={`mode-btn ${chatMode === 'search' ? 'active' : ''}`}
              onClick={() => setChatMode('search')}
            >
              🔍 Search
            </button>
            <button
              className={`mode-btn ${chatMode === 'chat' ? 'active' : ''}`}
              onClick={() => setChatMode('chat')}
            >
              💬 Chat
            </button>
          </div>
          {chatMode === 'chat' && (
            <button
              className={`mode-btn ${polish ? 'active' : ''}`}
              onClick={() => setPolish(!polish)}
              title="Polish answers for better fluency"
            >
              ✨ Polish
            </button>
          )}
          <div className="search-mode">
            <select
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value as SearchMode)}
            >
              <option value="lexical">Lexical (BM25)</option>
              <option value="semantic">Semantic (Embeddings)</option>
              <option value="hybrid">Hybrid (Best of Both)</option>
            </select>
          </div>
          <button
            className="model-selector-btn"
            onClick={() => setShowModelSelector(true)}
            title="Change AI model"
          >
            🤖 {getModelById(currentModelId)?.name || 'Model'}
          </button>
          <button
            className="perf-toggle"
            onClick={() => setShowPerf(!showPerf)}
            title="Toggle performance stats"
          >
            📊
          </button>
        </div>
        {searchMode === 'hybrid' && (
          <div className="alpha-slider-container">
            <label>
              <span>Semantic weight: {Math.round(alpha * 100)}%</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="alpha-slider"
              />
            </label>
          </div>
        )}
      </div>

      <div className="chat-content">
        {!hasDocuments && messages.length === 0 ? (
          <div className="chat-empty">
            <div className="upload-icon">📤</div>
            <h3>Add a source to get started</h3>
            <p>Upload PDFs, text files, or markdown documents in the Sources panel</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <div className="upload-icon">🔍</div>
            <h3>Ask anything about your documents</h3>
            <p>Type a question below to search using BM25</p>
          </div>
        ) : (
          <div className="messages-container">
            {messages.map((message) => (
              <div key={message.id} className={`message message-${message.type}`}>
                {message.type === 'user' ? (
                  <div className="message-bubble user-bubble">
                    <p>{message.text}</p>
                  </div>
                ) : (
                  <div className="message-bubble assistant-bubble">
                    {message.result ? (
                      <div className="search-results">
                        {message.result.generatedAnswer && (
                          <div className="generated-answer">
                            <p>{message.result.generatedAnswer}</p>
                          </div>
                        )}
                        <div className="results-header">
                          <span className="results-count">
                            {message.result.generatedAnswer ? 'Sources: ' : 'Found '}
                            {message.result.citations.length} results in{' '}
                            {message.result.latency.total.toFixed(0)}ms
                            {message.result.latency.generation && (
                              <> (gen: {message.result.latency.generation.toFixed(0)}ms)</>
                            )}
                            {message.result.latency.polish && (
                              <> (polish: {message.result.latency.polish.toFixed(0)}ms)</>
                            )}
                          </span>
                          {showPerf && (() => {
                            const stats = getLatencyStats()
                            return (
                              <div className="perf-stats">
                                <span>p50: {stats.p50.toFixed(0)}ms</span>
                                <span>p95: {stats.p95.toFixed(0)}ms</span>
                                <span>avg: {stats.mean.toFixed(0)}ms</span>
                                <span>({stats.count} queries)</span>
                              </div>
                            )
                          })()}
                        </div>

                        {(() => {
                          const showAll = messageState[message.id]?.showAllSources
                          const defaultLimit = message.result.generatedAnswer ? 3 : 5
                          const visibleCitations = showAll
                            ? message.result.citations
                            : message.result.citations.slice(0, defaultLimit)
                          const hasMore = message.result.citations.length > defaultLimit

                          return (
                            <>
                              {message.result.generatedAnswer && !showAll ? (
                                <div className="citation-badges">
                                  {visibleCitations.map((citation, idx) => (
                                    <div key={citation.chunkId} className="citation-badge" title={citation.text}>
                                      <span className="badge-number">[{idx + 1}]</span>
                                      <span className="badge-info">
                                        {citation.docName} · p{citation.pageNumber}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                visibleCitations.map((citation, idx) => (
                                  <div key={citation.chunkId} className="result-card">
                                    <div className="result-header">
                                      <span className="result-rank">#{idx + 1}</span>
                                      <span className="result-doc">{citation.docName}</span>
                                      <span className="result-page">Page {citation.pageNumber}</span>
                                      {citation.score !== undefined && (
                                        <span className="result-score">
                                          Score: {citation.score.toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="result-text">{citation.text}</p>
                                  </div>
                                ))
                              )}

                              {hasMore && (
                                <button
                                  className="show-all-sources-btn"
                                  onClick={() => toggleShowAllSources(message.id)}
                                >
                                  {showAll
                                    ? '↑ Show less'
                                    : `↓ Show all ${message.result.citations.length} sources`}
                                </button>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    ) : (
                      <p>{message.text}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {searching && (
              <div className="message message-assistant">
                <div className="message-bubble assistant-bubble typing">
                  <span>Searching...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}
      </div>

      <div className="chat-input-container">
        <input
          type="text"
          className="chat-input"
          placeholder={hasDocuments ? 'Ask anything...' : 'Upload a source to get started'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={!hasDocuments || searching}
        />
        <button
          className="btn-send"
          onClick={handleSearch}
          disabled={!hasDocuments || !query.trim() || searching}
        >
          {searching ? '⏳' : '➤'}
        </button>
      </div>

      {showModelSelector && (
        <ModelSelector
          currentModelId={currentModelId}
          onModelChange={handleModelChange}
          onClose={() => setShowModelSelector(false)}
        />
      )}

      {loadingModel && (
        <ModelLoadingOverlay
          modelName={loadingModel.modelName}
          status={loadingModel.status}
          progress={loadingModel.progress}
        />
      )}
    </div>
  )
}

export default Chat
