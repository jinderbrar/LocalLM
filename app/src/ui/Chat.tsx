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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Search,
  MessageCircle,
  Sparkles,
  Bot,
  BarChart3,
  Send,
  Loader2,
  Upload,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [alpha, setAlpha] = useState(0.5)
  const [polish, setPolish] = useState(false)
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

    const timeoutId = setTimeout(() => {
      console.warn('Model loading timeout')
      setLoadingModel(null)
      setError(`Timeout loading ${modelConfig.name}. Check console for errors.`)
    }, 120000)

    try {
      await initGenerationModel(newModelId, (progress) => {
        setLoadingModel({
          modelName: modelConfig.name,
          status: progress.status,
          progress: progress.progress,
        })
      })

      clearTimeout(timeoutId)
      setCurrentModelId(newModelId)
      localStorage.setItem('selectedModelId', newModelId)

      setTimeout(() => {
        setLoadingModel(null)
      }, 800)
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Failed to load model:', error)
      setError(
        `Failed to load ${modelConfig.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chat</h2>
          <div className="flex items-center gap-2">
            {/* Chat/Search Mode Toggle */}
            <Tabs value={chatMode} onValueChange={(v) => setChatMode(v as ChatMode)}>
              <TabsList className="h-9">
                <TabsTrigger value="search" className="gap-1.5 text-xs">
                  <Search className="h-3.5 w-3.5" />
                  Search
                </TabsTrigger>
                <TabsTrigger value="chat" className="gap-1.5 text-xs">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chat
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Polish Toggle */}
            {chatMode === 'chat' && (
              <Button
                variant={polish ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPolish(!polish)}
                className="gap-1.5"
                title="Polish answers for better fluency"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Polish
              </Button>
            )}

            {/* Search Mode Select */}
            <Select value={searchMode} onValueChange={(v) => setSearchMode(v as SearchMode)}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lexical">Lexical (BM25)</SelectItem>
                <SelectItem value="semantic">Semantic</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>

            {/* Model Selector Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowModelSelector(true)}
              className="gap-1.5"
              title="Change AI model"
            >
              <Bot className="h-3.5 w-3.5" />
              {getModelById(currentModelId)?.name || 'Model'}
            </Button>

            {/* Performance Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setShowPerf(!showPerf)}
              title="Toggle performance stats"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Alpha Slider for Hybrid Mode */}
        {searchMode === 'hybrid' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Semantic weight:</span>
              <span className="font-medium">{Math.round(alpha * 100)}%</span>
            </div>
            <Slider
              value={[alpha]}
              onValueChange={(v) => setAlpha(v[0])}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {!hasDocuments && messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Upload className="mb-4 h-16 w-16 text-muted-foreground/20" />
            <h3 className="mb-2 text-lg font-semibold">Add a source to get started</h3>
            <p className="text-sm text-muted-foreground">
              Upload PDFs, text files, or markdown documents in the Sources panel
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Search className="mb-4 h-16 w-16 text-muted-foreground/20" />
            <h3 className="mb-2 text-lg font-semibold">Ask anything about your documents</h3>
            <p className="text-sm text-muted-foreground">Type a question below to search</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex', message.type === 'user' ? 'justify-end' : 'justify-start')}
              >
                {message.type === 'user' ? (
                  <div className="max-w-[80%] rounded-lg bg-primary px-4 py-2 text-primary-foreground">
                    <p className="text-sm">{message.text}</p>
                  </div>
                ) : (
                  <div className="max-w-[90%] space-y-3">
                    {message.result ? (
                      <>
                        {/* Generated Answer */}
                        {message.result.generatedAnswer && (
                          <Card className="p-4">
                            <p className="text-sm leading-relaxed">{message.result.generatedAnswer}</p>
                          </Card>
                        )}

                        {/* Results Info */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {message.result.generatedAnswer ? 'Sources: ' : 'Found '}
                            {message.result.citations.length} results
                          </span>
                          <span>•</span>
                          <span>{message.result.latency.total.toFixed(0)}ms</span>
                          {message.result.latency.generation && (
                            <>
                              <span>•</span>
                              <span>gen: {message.result.latency.generation.toFixed(0)}ms</span>
                            </>
                          )}
                          {message.result.latency.polish && (
                            <>
                              <span>•</span>
                              <span>polish: {message.result.latency.polish.toFixed(0)}ms</span>
                            </>
                          )}
                          {showPerf && (() => {
                            const stats = getLatencyStats()
                            return (
                              <>
                                <span>•</span>
                                <span>p50: {stats.p50.toFixed(0)}ms</span>
                                <span>•</span>
                                <span>p95: {stats.p95.toFixed(0)}ms</span>
                                <span>•</span>
                                <span>avg: {stats.mean.toFixed(0)}ms</span>
                                <span>({stats.count} queries)</span>
                              </>
                            )
                          })()}
                        </div>

                        {/* Citations */}
                        {(() => {
                          const showAll = messageState[message.id]?.showAllSources
                          const defaultLimit = message.result.generatedAnswer ? 3 : 5
                          const visibleCitations = showAll
                            ? message.result.citations
                            : message.result.citations.slice(0, defaultLimit)
                          const hasMore = message.result.citations.length > defaultLimit

                          return (
                            <div className="space-y-2">
                              {message.result.generatedAnswer && !showAll ? (
                                <div className="flex flex-wrap gap-2">
                                  {visibleCitations.map((citation, idx) => (
                                    <Badge
                                      key={citation.chunkId}
                                      variant="secondary"
                                      className="gap-1 text-xs"
                                      title={citation.text}
                                    >
                                      <span className="font-semibold">[{idx + 1}]</span>
                                      <span>
                                        {citation.docName} · p{citation.pageNumber}
                                      </span>
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                visibleCitations.map((citation, idx) => (
                                  <Card key={citation.chunkId} className="p-3">
                                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                                      <Badge variant="outline" className="font-semibold">
                                        #{idx + 1}
                                      </Badge>
                                      <span className="font-medium">{citation.docName}</span>
                                      <span className="text-muted-foreground">
                                        Page {citation.pageNumber}
                                      </span>
                                      {citation.score !== undefined && (
                                        <Badge variant="secondary" className="ml-auto">
                                          {citation.score.toFixed(2)}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                      {citation.text}
                                    </p>
                                  </Card>
                                ))
                              )}

                              {hasMore && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleShowAllSources(message.id)}
                                  className="w-full gap-2"
                                >
                                  {showAll ? (
                                    <>
                                      <ChevronUp className="h-4 w-4" />
                                      Show less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4" />
                                      Show all {message.result.citations.length} sources
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          )
                        })()}
                      </>
                    ) : (
                      <Card className="p-4">
                        <p className="text-sm">{message.text}</p>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Searching Indicator */}
            {searching && (
              <div className="flex justify-start">
                <Card className="flex items-center gap-2 p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Searching...</span>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={hasDocuments ? 'Ask anything...' : 'Upload a source to get started'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!hasDocuments || searching}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={!hasDocuments || !query.trim() || searching}
            size="icon"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Modals */}
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
