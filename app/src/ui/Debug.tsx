import { useState, useEffect } from 'react'
import { debugLogger } from '../core/debug'
import type { DebugEvent } from '../core/debug'
import PromptEditor from './PromptEditor'
import './Debug.css'

function Debug() {
  const [events, setEvents] = useState<DebugEvent[]>([])
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'logs' | 'prompts'>('logs')

  useEffect(() => {
    // Subscribe to debug events
    const unsubscribe = debugLogger.subscribe((newEvents) => {
      setEvents(newEvents)
    })

    // Load existing events
    setEvents(debugLogger.getEvents())

    return unsubscribe
  }, [])

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  const clearLogs = () => {
    debugLogger.clear()
    setExpandedEvents(new Set())
  }

  const formatEventType = (type: string): string => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getEventIcon = (type: string): string => {
    switch (type) {
      case 'query_start':
        return '🔍'
      case 'retrieval_start':
        return '📡'
      case 'retrieval_complete':
        return '✅'
      case 'context_built':
        return '📝'
      case 'generation_start':
        return '🤖'
      case 'prompt_sent':
        return '💬'
      case 'generation_complete':
        return '✨'
      case 'polish_start':
        return '💎'
      case 'polish_prompt_sent':
        return '📨'
      case 'polish_complete':
        return '🌟'
      case 'query_complete':
        return '🏁'
      case 'error':
        return '❌'
      default:
        return '📌'
    }
  }

  const renderEventData = (event: DebugEvent) => {
    const isExpanded = expandedEvents.has(event.id)

    switch (event.type) {
      case 'query_start':
        return (
          <div className="event-data">
            <div className="event-summary">
              <strong>Query:</strong> {event.data.query}
            </div>
            {isExpanded && (
              <div className="event-details">
                <div>
                  <strong>Mode:</strong> {event.data.mode}
                </div>
                <div>
                  <strong>Chat Mode:</strong> {event.data.chatMode}
                </div>
              </div>
            )}
          </div>
        )

      case 'retrieval_complete':
        return (
          <div className="event-data">
            <div className="event-summary">
              <strong>Results:</strong> {event.data.resultsCount} chunks retrieved
              {event.duration && <span> ({event.duration.toFixed(0)}ms)</span>}
            </div>
            {isExpanded && (
              <div className="event-details">
                <div>
                  <strong>Mode:</strong> {event.data.mode}
                </div>
                <div>
                  <strong>TopK:</strong> {event.data.topK}
                </div>
                {event.data.alpha !== undefined && (
                  <div>
                    <strong>Alpha:</strong> {event.data.alpha}
                  </div>
                )}
                <div className="chunks-list">
                  <strong>Chunks:</strong>
                  {event.data.chunks.map((chunk: any, idx: number) => (
                    <div key={chunk.id} className="chunk-item">
                      <div className="chunk-header">
                        <span className="chunk-rank">#{idx + 1}</span>
                        <span className="chunk-doc">{chunk.docName}</span>
                        <span className="chunk-page">p{chunk.pageNumber}</span>
                        <span className="chunk-score">
                          {chunk.score.toFixed(3)}
                        </span>
                      </div>
                      <div className="chunk-text">
                        {chunk.text.substring(0, 150)}
                        {chunk.text.length > 150 && '...'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'context_built':
        return (
          <div className="event-data">
            <div className="event-summary">
              <strong>Context:</strong> {event.data.contextLength} chars from{' '}
              {event.data.chunksUsed} chunks
            </div>
            {isExpanded && (
              <div className="event-details">
                <div className="context-preview">
                  <strong>Context Preview:</strong>
                  <pre className="code-block">{event.data.contextPreview}</pre>
                </div>
              </div>
            )}
          </div>
        )

      case 'prompt_sent':
        return (
          <div className="event-data">
            <div className="event-summary">
              <strong>Prompt:</strong> {event.data.promptLength} chars to{' '}
              {event.data.modelId || 'model'}
            </div>
            {isExpanded && (
              <div className="event-details">
                <div>
                  <strong>Model:</strong> {event.data.modelId}
                </div>
                <div>
                  <strong>Type:</strong> {event.data.modelType}
                </div>
                {event.data.temperature !== undefined && (
                  <div>
                    <strong>Temperature:</strong> {event.data.temperature}
                  </div>
                )}
                <div className="prompt-preview">
                  <strong>Full Prompt:</strong>
                  <pre className="code-block">{event.data.prompt}</pre>
                </div>
              </div>
            )}
          </div>
        )

      case 'generation_complete':
        return (
          <div className="event-data">
            <div className="event-summary">
              <strong>Generated:</strong> {event.data.answerLength} chars
              {event.duration && <span> ({event.duration.toFixed(0)}ms)</span>}
            </div>
            {isExpanded && (
              <div className="event-details">
                <div className="answer-preview">
                  <strong>Answer:</strong>
                  <pre className="code-block">{event.data.answer}</pre>
                </div>
                {event.data.rawOutput && (
                  <div className="raw-output">
                    <strong>Raw Output:</strong>
                    <pre className="code-block">{event.data.rawOutput}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'polish_start':
        return (
          <div className="event-data">
            <div className="event-summary">
              <strong>Polishing:</strong> Improving answer fluency
            </div>
            {isExpanded && (
              <div className="event-details">
                <div className="extractive-answer">
                  <strong>Original Answer:</strong>
                  <pre className="code-block">{event.data.extractiveAnswer}</pre>
                </div>
              </div>
            )}
          </div>
        )

      case 'polish_prompt_sent':
        return (
          <div className="event-data">
            <div className="event-summary">
              <strong>Polish Prompt:</strong> {event.data.promptLength} chars
            </div>
            {isExpanded && (
              <div className="event-details">
                <div className="prompt-preview">
                  <strong>Full Prompt:</strong>
                  <pre className="code-block">{event.data.prompt}</pre>
                </div>
              </div>
            )}
          </div>
        )

      case 'polish_complete':
        return (
          <div className="event-data">
            <div className="event-summary">
              <strong>Polished:</strong> {event.data.answerLength} chars
              {event.duration && <span> ({event.duration.toFixed(0)}ms)</span>}
            </div>
            {isExpanded && (
              <div className="event-details">
                <div className="polished-answer">
                  <strong>Polished Answer:</strong>
                  <pre className="code-block">{event.data.polishedAnswer}</pre>
                </div>
              </div>
            )}
          </div>
        )

      case 'query_complete':
        return (
          <div className="event-data">
            <div className="event-summary">
              <strong>Complete:</strong> Total time {event.duration?.toFixed(0)}ms
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="event-data error">
            <div className="event-summary">
              <strong>Error:</strong> {event.data.error}
            </div>
            {isExpanded && event.data.stack && (
              <div className="event-details">
                <div className="error-stack">
                  <strong>Stack:</strong>
                  <pre className="code-block">{event.data.stack}</pre>
                </div>
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="event-data">
            <div className="event-summary">
              {JSON.stringify(event.data).substring(0, 100)}
            </div>
          </div>
        )
    }
  }

  // Group events by query
  const groupedEvents = events.reduce(
    (acc, event) => {
      const queryId = event.id.split('-').slice(0, 2).join('-')
      if (!acc[queryId]) {
        acc[queryId] = []
      }
      acc[queryId].push(event)
      return acc
    },
    {} as Record<string, DebugEvent[]>
  )

  const queryIds = Object.keys(groupedEvents).reverse()

  return (
    <div className="debug">
      <div className="debug-header">
        <h2>Debug Console</h2>
        <div className="debug-tabs">
          <button
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            📋 Logs
          </button>
          <button
            className={`tab-btn ${activeTab === 'prompts' ? 'active' : ''}`}
            onClick={() => setActiveTab('prompts')}
          >
            ✏️ Prompts
          </button>
        </div>
        <button className="btn-clear" onClick={clearLogs} title="Clear logs">
          🗑️
        </button>
      </div>

      <div className="debug-content">
        {activeTab === 'logs' ? (
          <div className="logs-panel">
            {queryIds.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <p>No logs yet. Execute a search query to see debug information.</p>
              </div>
            ) : (
              <div className="queries-list">
                {queryIds.map((queryId) => {
                  const queryEvents = groupedEvents[queryId]
                  const firstEvent = queryEvents[0]
                  const lastEvent = queryEvents[queryEvents.length - 1]
                  const isQueryExpanded = expandedEvents.has(queryId)

                  return (
                    <div key={queryId} className="query-group">
                      <div
                        className="query-header"
                        onClick={() => toggleExpanded(queryId)}
                      >
                        <span className="query-icon">
                          {isQueryExpanded ? '▼' : '▶'}
                        </span>
                        <span className="query-info">
                          <strong>{firstEvent.data.query || 'Query'}</strong>
                          <span className="query-meta">
                            {' '}
                            • {new Date(firstEvent.timestamp).toLocaleTimeString()}{' '}
                            • {queryEvents.length} events
                            {lastEvent.duration &&
                              ` • ${lastEvent.duration.toFixed(0)}ms`}
                          </span>
                        </span>
                      </div>
                      {isQueryExpanded && (
                        <div className="events-list">
                          {queryEvents.map((event) => (
                            <div key={event.id} className="event-item">
                              <div
                                className="event-header"
                                onClick={() => toggleExpanded(event.id)}
                              >
                                <span className="event-icon">
                                  {getEventIcon(event.type)}
                                </span>
                                <span className="event-type">
                                  {formatEventType(event.type)}
                                </span>
                                <span className="event-time">
                                  {new Date(event.timestamp).toLocaleTimeString()}
                                </span>
                                <span className="event-expand">
                                  {expandedEvents.has(event.id) ? '▼' : '▶'}
                                </span>
                              </div>
                              {renderEventData(event)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="prompts-panel">
            <PromptEditor />
          </div>
        )}
      </div>
    </div>
  )
}

export default Debug
