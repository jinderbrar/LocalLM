import { useState, useEffect, useRef } from 'react'
import { executeSearch } from '../core/rank'
import { getAllDocs } from '../core/storage/db'
import { getLatencyStats } from '../core/perf/latency'
import type { SearchResult, SearchMode } from '../core/types'
import './Chat.css'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  text: string
  result?: SearchResult
  timestamp: number
}

function Chat() {
  const [query, setQuery] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('lexical')
  const [alpha, setAlpha] = useState(0.5) // For hybrid: semantic weight
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasDocuments, setHasDocuments] = useState(false)
  const [showPerf, setShowPerf] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
        topK: 10,
        alpha: searchMode === 'hybrid' ? alpha : undefined,
      })

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        text: `Found ${searchResult.citations.length} results`,
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
          <div className="search-mode">
            <select
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value as SearchMode)}
            >
              <option value="lexical">Lexical (BM25)</option>
              <option value="semantic">
                Semantic (Embeddings)
              </option>
              <option value="hybrid">
                Hybrid (Best of Both)
              </option>
            </select>
          </div>
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
                        <div className="results-header">
                          <span className="results-count">
                            Found {message.result.citations.length} results in{' '}
                            {message.result.latency.total.toFixed(0)}ms
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
                        {message.result.citations.map((citation, idx) => (
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
                        ))}
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
    </div>
  )
}

export default Chat
