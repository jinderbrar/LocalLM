import { useState, useEffect } from 'react'
import {
  getCustomPrompt,
  saveCustomPrompt,
  resetCustomPrompt,
  getDefaultGenerationPrompt,
  getDefaultPolishPrompt,
} from '../core/debug/prompts'
import type { PromptType } from '../core/debug/prompts'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MessageSquare, Sparkles, Palette, FileText, CheckCircle2 } from 'lucide-react'

function PromptEditor() {
  const [activePrompt, setActivePrompt] = useState<PromptType>('generation')
  const [promptText, setPromptText] = useState('')
  const [hasCustom, setHasCustom] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    loadPrompt(activePrompt)
  }, [activePrompt])

  const loadPrompt = (type: PromptType) => {
    const custom = getCustomPrompt(type)
    if (custom) {
      setPromptText(custom)
      setHasCustom(true)
    } else {
      const defaultPrompt =
        type === 'generation' ? getDefaultGenerationPrompt() : getDefaultPolishPrompt()
      setPromptText(defaultPrompt)
      setHasCustom(false)
    }
  }

  const handleSave = () => {
    saveCustomPrompt(activePrompt, promptText)
    setHasCustom(true)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  const handleReset = () => {
    resetCustomPrompt(activePrompt)
    loadPrompt(activePrompt)
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden p-4">
      {/* Tabs */}
      <Tabs value={activePrompt} onValueChange={(v) => setActivePrompt(v as PromptType)} className="flex-shrink-0">
        <TabsList className="w-full">
          <TabsTrigger value="generation" className="flex-1 gap-1.5 px-2 text-xs">
            <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">Generation Prompt</span>
          </TabsTrigger>
          <TabsTrigger value="polish" className="flex-1 gap-1.5 px-2 text-xs">
            <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">Polish Prompt</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Info Card */}
      <Card className="flex-shrink-0 border-primary/20 bg-primary/5 p-3">
        <div className="space-y-2">
          <p className="text-xs font-medium">Available placeholders:</p>
          {activePrompt === 'generation' ? (
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="flex-shrink-0 font-mono text-xs">
                  {'{context}'}
                </Badge>
                <span className="text-muted-foreground">The retrieved document chunks</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="flex-shrink-0 font-mono text-xs">
                  {'{question}'}
                </Badge>
                <span className="text-muted-foreground">The user's question</span>
              </li>
            </ul>
          ) : (
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="flex-shrink-0 font-mono text-xs">
                  {'{question}'}
                </Badge>
                <span className="text-muted-foreground">The user's question</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="flex-shrink-0 font-mono text-xs">
                  {'{answer}'}
                </Badge>
                <span className="text-muted-foreground">The extractive answer to polish</span>
              </li>
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            {activePrompt === 'generation'
              ? 'This prompt is used when generating answers from retrieved documents.'
              : 'This prompt is used to make answers more fluent and natural.'}
          </p>
        </div>
      </Card>

      {/* Status Badge */}
      <div className="flex flex-shrink-0 items-center justify-end">
        {hasCustom ? (
          <Badge variant="default" className="gap-1 text-xs">
            <Palette className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">Using custom prompt</span>
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 text-xs">
            <FileText className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">Using default prompt</span>
          </Badge>
        )}
      </div>

      {/* Textarea */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <Textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Enter your prompt template..."
          className="h-full resize-none font-mono text-xs"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={handleReset} disabled={!hasCustom} size="sm" className="flex-1 text-xs">
          Reset to Default
        </Button>
        <Button onClick={handleSave} size="sm" className="flex-1 text-xs">
          Save Custom Prompt
        </Button>
      </div>

      {/* Success Message */}
      {showSaved && (
        <Alert className="flex-shrink-0 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-xs text-green-800 dark:text-green-200">
            Prompt saved successfully!
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default PromptEditor
