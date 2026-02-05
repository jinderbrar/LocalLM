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
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Tabs */}
      <Tabs value={activePrompt} onValueChange={(v) => setActivePrompt(v as PromptType)}>
        <TabsList className="w-full">
          <TabsTrigger value="generation" className="flex-1 gap-2">
            <MessageSquare className="h-4 w-4" />
            Generation Prompt
          </TabsTrigger>
          <TabsTrigger value="polish" className="flex-1 gap-2">
            <Sparkles className="h-4 w-4" />
            Polish Prompt
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5 p-4">
        <div className="space-y-3">
          <p className="text-sm font-medium">Available placeholders:</p>
          {activePrompt === 'generation' ? (
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 font-mono">
                  {'{context}'}
                </Badge>
                <span className="text-muted-foreground">The retrieved document chunks</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 font-mono">
                  {'{question}'}
                </Badge>
                <span className="text-muted-foreground">The user's question</span>
              </li>
            </ul>
          ) : (
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 font-mono">
                  {'{question}'}
                </Badge>
                <span className="text-muted-foreground">The user's question</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 font-mono">
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
      <div className="flex items-center justify-end">
        {hasCustom ? (
          <Badge variant="default" className="gap-1.5">
            <Palette className="h-3 w-3" />
            Using custom prompt
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1.5">
            <FileText className="h-3 w-3" />
            Using default prompt
          </Badge>
        )}
      </div>

      {/* Textarea */}
      <Textarea
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        placeholder="Enter your prompt template..."
        className="min-h-[300px] flex-1 font-mono text-sm"
      />

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleReset} disabled={!hasCustom} className="flex-1">
          Reset to Default
        </Button>
        <Button onClick={handleSave} className="flex-1">
          Save Custom Prompt
        </Button>
      </div>

      {/* Success Message */}
      {showSaved && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Prompt saved successfully!
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default PromptEditor
