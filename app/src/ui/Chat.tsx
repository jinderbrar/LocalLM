import { useState, useEffect, useRef } from 'react'
import { MarkdownPreview } from '@/components/MarkdownPreview'
import { PDFPreview } from '@/components/PDFPreview'
import { executeSearch } from '../core/rank'
import { getAllDocs } from '../core/storage/db'
import { getLatencyStats } from '../core/perf/latency'
import { ingestDocument } from '../core/ingest/pipelineIngest'
import { shouldLoadSampleDoc, loadSampleDocument } from '../core/demo/loadSample'
import { getDoc, getChunksByDocId, getFileBlob } from '../core/storage/db'
import { reconstructTextFromChunks } from '../core/utils/textReconstruction'
import type { SearchResult, SearchMode, ChatMode, Doc } from '../core/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Sparkles,
  Send,
  Loader2,
  Upload,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Search,
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
  const [polish, setPolish] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageState, setMessageState] = useState<MessageState>({})
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasDocuments, setHasDocuments] = useState(false)
  const [showPasteDialog, setShowPasteDialog] = useState(false)
  const [pastedText, setPastedText] = useState('')
  const [pasteDocName, setPasteDocName] = useState('')
  const [ingesting, setIngesting] = useState(false)
  const [ingestProgress, setIngestProgress] = useState({ stage: '', progress: 0 })
  const [loadingSample, setLoadingSample] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<{ name: string; content: string; type: Doc['type']; blob?: Blob } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fixed configuration - Semantic search only
  const searchMode: SearchMode = 'semantic'
  const chatMode: ChatMode = 'chat'

  // Quick suggestion prompts for new users
  const suggestions = [
    "What are the key features of this application?",
    "How does the search work?",
    "Is my data private?",
  ]

  const handleSuggestionClick = async (suggestion: string) => {
    // Set query and trigger search directly
    setQuery('')

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: suggestion,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setSearching(true)
    setError(null)

    try {
      const searchResult = await executeSearch({
        text: suggestion,
        mode: searchMode,
        topK: 5,
        chatMode,
        polish: polish,
      })

      const assistantText = searchResult.generatedAnswer || 'Unable to generate an answer.'

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        text: assistantText,
        result: searchResult,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const toggleShowAllSources = (messageId: string) => {
    setMessageState((prev) => ({
      ...prev,
      [messageId]: {
        showAllSources: !prev[messageId]?.showAllSources,
      },
    }))
  }

  const handlePreviewDocument = async (docId: string) => {
    try {
      console.log('📄 Loading preview for docId:', docId)
      const doc = await getDoc(docId)
      if (!doc) {
        console.error('Document not found:', docId)
        setError('Document not found')
        return
      }

      console.log('📄 Document found:', doc.name, 'type:', doc.type)

      // For PDFs, try to load the original file blob
      if (doc.type === 'pdf') {
        const blob = await getFileBlob(docId)
        if (blob) {
          console.log('📄 Loaded PDF blob')
          setPreviewDoc({
            name: doc.name,
            content: '', // Not used for PDF
            type: doc.type,
            blob
          })
          return
        }
        console.log('⚠️ PDF blob not found, falling back to text')
      }

      // Get all chunks for this document to reconstruct the text
      const chunks = await getChunksByDocId(docId)
      console.log(`📄 Loaded ${chunks.length} chunks`)

      // Reconstruct text with intelligent overlap handling
      const content = reconstructTextFromChunks(chunks)
      console.log(`📄 Reconstructed ${content.length} characters`)

      setPreviewDoc({
        name: doc.name,
        content: content || 'No content available',
        type: doc.type
      })
    } catch (error) {
      console.error('Failed to load document:', error)
      setError('Failed to load document preview')
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

    // Auto-load sample document for first-time users
    if (await shouldLoadSampleDoc()) {
      setLoadingSample(true)
      await loadSampleDocument((stage, progress) => {
        setIngestProgress({ stage, progress })
      })
      setLoadingSample(false)
      // Recheck documents after loading sample
      const updatedDocs = await getAllDocs()
      setHasDocuments(updatedDocs.length > 0)
    }
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
        chatMode,
        polish: polish,
      })

      const assistantText = searchResult.generatedAnswer || 'Unable to generate an answer.'

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

  function createFileFromText(text: string, filename: string): File {
    const blob = new Blob([text], { type: 'text/plain' })
    return new File([blob], filename, { type: 'text/plain' })
  }

  async function handlePasteText() {
    if (!pastedText.trim()) {
      setError('Please enter some text')
      return
    }

    if (!pasteDocName.trim()) {
      setError('Please enter a document name')
      return
    }

    setIngesting(true)
    setError(null)

    try {
      const filename = pasteDocName.trim().endsWith('.txt')
        ? pasteDocName.trim()
        : `${pasteDocName.trim()}.txt`

      const file = createFileFromText(pastedText, filename)

      await ingestDocument(file, (stage, progress) => {
        setIngestProgress({ stage, progress })
      })

      // Reset and close
      setPastedText('')
      setPasteDocName('')
      setShowPasteDialog(false)
      setIngesting(false)

      // Refresh document list
      await checkDocuments()
    } catch (err) {
      console.error('Failed to ingest pasted text:', err)
      setError(err instanceof Error ? err.message : 'Failed to process text')
      setIngesting(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">Chat</h2>
        <Button
          variant={polish ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPolish(!polish)}
          className="gap-1"
          title="Polish answers for better fluency"
        >
          <Sparkles className="h-4 w-4" />
          Polish
        </Button>
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
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div>
              <Upload className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
              <h3 className="mb-2 text-lg font-semibold">Add a source to get started</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Upload files or paste text to create your knowledge base
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="lg" className="gap-2" disabled>
                <Upload className="h-5 w-5" />
                Upload Source
                <span className="text-xs text-muted-foreground">(Use Sources panel)</span>
              </Button>
              <Button
                variant="default"
                size="lg"
                className="gap-2"
                onClick={() => setShowPasteDialog(true)}
              >
                <FileText className="h-5 w-5" />
                Paste Text
              </Button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div>
              <Search className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
              <h3 className="mb-2 text-lg font-semibold">Ask anything about your documents</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {loadingSample ? 'Loading sample document...' : 'Try one of these questions or type your own'}
              </p>
            </div>
            {!loadingSample && (
              <div className="flex flex-col gap-3 max-w-2xl w-full px-4">
                <p className="text-xs text-muted-foreground text-center mb-1">
                  💡 Quick suggestions to get started
                </p>
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="group relative overflow-hidden rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      animation: `slideUp 0.4s ease-out ${idx * 0.1}s both`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 rounded-full bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {suggestion}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Click to ask →
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {loadingSample && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{ingestProgress.stage || 'Loading...'}</span>
              </div>
            )}
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
                          <span>Sources: {message.result.citations.length}</span>
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
                          {(() => {
                            const stats = getLatencyStats()
                            return (
                              <>
                                <span>•</span>
                                <span>p95: {stats.p95.toFixed(0)}ms</span>
                                <span>•</span>
                                <span>avg: {stats.mean.toFixed(0)}ms</span>
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
                                      className="gap-1 text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                                      title={`${citation.text}\n\nClick to preview document`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        console.log('Badge clicked, citation:', citation)
                                        handlePreviewDocument(citation.docId)
                                      }}
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
                                  <Card
                                    key={citation.chunkId}
                                    className="p-3 cursor-pointer hover:border-primary transition-colors group"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      console.log('Card clicked, citation:', citation)
                                      handlePreviewDocument(citation.docId)
                                    }}
                                    title="Click to preview full document"
                                  >
                                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                                      <Badge variant="outline" className="font-semibold">
                                        #{idx + 1}
                                      </Badge>
                                      <span className="font-medium group-hover:text-primary transition-colors">{citation.docName}</span>
                                      <span className="text-muted-foreground">
                                        Page {citation.pageNumber}
                                      </span>
                                      {citation.score !== undefined && (
                                        <Badge variant="secondary" className="ml-auto">
                                          {citation.score.toFixed(2)}
                                        </Badge>
                                      )}
                                      <FileText className="h-3 w-3 text-muted-foreground group-hover:text-primary ml-auto" />
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

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewDoc?.name}
            </DialogTitle>
            <DialogDescription>
              Full document preview
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {previewDoc?.type === 'pdf' && previewDoc?.blob ? (
              <PDFPreview blob={previewDoc.blob} />
            ) : previewDoc?.type === 'md' ? (
              <div className="p-4 bg-muted/30 rounded-lg">
                <MarkdownPreview content={previewDoc?.content || ''} />
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg whitespace-pre-wrap font-sans text-sm leading-7 text-foreground">
                {previewDoc?.content.split('\n\n').map((para, idx) => (
                  <p key={idx} className="mb-4">
                    {para.trim()}
                  </p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDoc(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paste Text Dialog */}
      <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Paste Text</DialogTitle>
            <DialogDescription>
              Paste or type your text below. It will be processed as a new document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="doc-name" className="text-sm font-medium">
                Document Name
              </label>
              <Input
                id="doc-name"
                placeholder="e.g., Meeting Notes, Research Article"
                value={pasteDocName}
                onChange={(e) => setPasteDocName(e.target.value)}
                disabled={ingesting}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="pasted-text" className="text-sm font-medium">
                Text Content
              </label>
              <Textarea
                id="pasted-text"
                placeholder="Paste your text here..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                disabled={ingesting}
              />
              <p className="text-xs text-muted-foreground">
                {pastedText.length.toLocaleString()} characters
              </p>
            </div>
            {ingesting && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{ingestProgress.stage}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${ingestProgress.progress * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasteDialog(false)} disabled={ingesting}>
              Cancel
            </Button>
            <Button
              onClick={handlePasteText}
              disabled={ingesting || !pastedText.trim() || !pasteDocName.trim()}
            >
              {ingesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Chat
