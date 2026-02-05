import { useState, useEffect } from 'react'
import { debugLogger } from '../core/debug'
import type { DebugEvent } from '../core/debug'
import PromptEditor from './PromptEditor'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Radio,
  CheckCircle2,
  FileText,
  Bot,
  MessageSquare,
  Sparkles,
  Gem,
  Send,
  Star,
  Flag,
  AlertCircle,
  Pin,
  Trash2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function Debug() {
  const [events, setEvents] = useState<DebugEvent[]>([])
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  useEffect(() => {
    const unsubscribe = debugLogger.subscribe((newEvents) => {
      setEvents(newEvents)
    })
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

  const getEventIcon = (type: string) => {
    const icons: Record<string, any> = {
      query_start: Search,
      retrieval_start: Radio,
      retrieval_complete: CheckCircle2,
      context_built: FileText,
      generation_start: Bot,
      prompt_sent: MessageSquare,
      generation_complete: Sparkles,
      polish_start: Gem,
      polish_prompt_sent: Send,
      polish_complete: Star,
      query_complete: Flag,
      error: AlertCircle,
    }
    const Icon = icons[type] || Pin
    return <Icon className="h-4 w-4" />
  }

  const renderEventData = (event: DebugEvent) => {
    const isExpanded = expandedEvents.has(event.id)

    const renderDetails = () => {
      switch (event.type) {
        case 'query_start':
          return (
            <>
              <div className="text-sm">
                <span className="font-medium">Query:</span> {event.data.query}
              </div>
              {isExpanded && (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div>Mode: {event.data.mode}</div>
                  <div>Chat Mode: {event.data.chatMode}</div>
                </div>
              )}
            </>
          )

        case 'retrieval_complete':
          return (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Results:</span>
                <Badge variant="secondary">{event.data.resultsCount} chunks</Badge>
                {event.duration && (
                  <Badge variant="outline">{event.duration.toFixed(0)}ms</Badge>
                )}
              </div>
              {isExpanded && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline">Mode: {event.data.mode}</Badge>
                    <Badge variant="outline">TopK: {event.data.topK}</Badge>
                    {event.data.alpha !== undefined && (
                      <Badge variant="outline">Alpha: {event.data.alpha}</Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    {event.data.chunks?.map((chunk: any, idx: number) => (
                      <Card key={chunk.id} className="p-2">
                        <div className="mb-1 flex items-center gap-2 text-xs">
                          <Badge className="h-5">{idx + 1}</Badge>
                          <span className="flex-1 font-medium">{chunk.docName}</span>
                          <span className="text-muted-foreground">p{chunk.pageNumber}</span>
                          <Badge variant="secondary">{chunk.score.toFixed(3)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {chunk.text.substring(0, 150)}
                          {chunk.text.length > 150 && '...'}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )

        case 'context_built':
          return (
            <>
              <div className="text-sm">
                <span className="font-medium">Context:</span> {event.data.contextLength} chars from{' '}
                {event.data.chunksUsed} chunks
              </div>
              {isExpanded && event.data.contextPreview && (
                <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-2 text-xs">
                  {event.data.contextPreview}
                </pre>
              )}
            </>
          )

        case 'prompt_sent':
          return (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Prompt:</span>
                <Badge variant="secondary">{event.data.promptLength} chars</Badge>
                <Badge variant="outline">{event.data.modelId}</Badge>
              </div>
              {isExpanded && event.data.prompt && (
                <pre className="mt-2 overflow-x-auto rounded-md bg-slate-950 p-3 text-xs text-slate-50 dark:bg-slate-900">
                  {event.data.prompt}
                </pre>
              )}
            </>
          )

        case 'generation_complete':
          return (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Generated:</span>
                <Badge variant="secondary">{event.data.answerLength} chars</Badge>
                {event.duration && (
                  <Badge variant="outline">{event.duration.toFixed(0)}ms</Badge>
                )}
              </div>
              {isExpanded && event.data.answer && (
                <Card className="mt-2 p-3">
                  <p className="text-sm">{event.data.answer}</p>
                </Card>
              )}
            </>
          )

        case 'polish_complete':
          return (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Polished:</span>
                <Badge variant="secondary">{event.data.answerLength} chars</Badge>
                {event.duration && (
                  <Badge variant="outline">{event.duration.toFixed(0)}ms</Badge>
                )}
              </div>
              {isExpanded && event.data.polishedAnswer && (
                <Card className="mt-2 p-3">
                  <p className="text-sm">{event.data.polishedAnswer}</p>
                </Card>
              )}
            </>
          )

        case 'query_complete':
          return (
            <div className="text-sm">
              <span className="font-medium">Complete:</span> Total time{' '}
              {event.duration?.toFixed(0)}ms
            </div>
          )

        case 'error':
          return (
            <>
              <div className="text-sm font-medium text-destructive">{event.data.error}</div>
              {isExpanded && event.data.stack && (
                <pre className="mt-2 overflow-x-auto rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  {event.data.stack}
                </pre>
              )}
            </>
          )

        default:
          return (
            <div className="text-sm text-muted-foreground">
              {JSON.stringify(event.data).substring(0, 100)}
            </div>
          )
      }
    }

    return renderDetails()
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
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">Debug Console</h2>
        <Button variant="ghost" size="icon" onClick={clearLogs} title="Clear logs">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="logs" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="logs" className="gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="prompts" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Prompts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="flex-1 overflow-y-auto p-4 pt-2">
          {queryIds.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <BarChart3 className="mb-4 h-16 w-16 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">
                No logs yet. Execute a search query to see debug information.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {queryIds.map((queryId) => {
                const queryEvents = groupedEvents[queryId]
                const firstEvent = queryEvents[0]
                const lastEvent = queryEvents[queryEvents.length - 1]
                const isQueryExpanded = expandedEvents.has(queryId)

                return (
                  <Card key={queryId} className="overflow-hidden">
                    <button
                      onClick={() => toggleExpanded(queryId)}
                      className="flex w-full items-center gap-2 p-3 text-left transition-colors hover:bg-accent"
                    >
                      {isQueryExpanded ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{firstEvent.data.query || 'Query'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(firstEvent.timestamp).toLocaleTimeString()} • {queryEvents.length}{' '}
                          events
                          {lastEvent.duration && ` • ${lastEvent.duration.toFixed(0)}ms`}
                        </p>
                      </div>
                    </button>

                    {isQueryExpanded && (
                      <div className="space-y-2 border-t p-3 pt-2">
                        {queryEvents.map((event) => (
                          <Card key={event.id} className="overflow-hidden">
                            <button
                              onClick={() => toggleExpanded(event.id)}
                              className="flex w-full items-center gap-2 p-2 text-left transition-colors hover:bg-accent"
                            >
                              <div className="flex items-center gap-2">
                                {getEventIcon(event.type)}
                                <span className="text-sm font-medium">
                                  {formatEventType(event.type)}
                                </span>
                              </div>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                              {expandedEvents.has(event.id) ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </button>
                            <div className="px-4 pb-3">{renderEventData(event)}</div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prompts" className="flex-1 overflow-hidden">
          <PromptEditor />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Add missing import
import { BarChart3 } from 'lucide-react'

export default Debug
