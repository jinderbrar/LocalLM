import { useState, useEffect } from 'react'
import { AVAILABLE_MODELS, isModelCached, type ModelConfig } from '../core/generate'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Download, AlertTriangle, Circle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModelSelectorProps {
  currentModelId: string
  onModelChange: (modelId: string) => void
  onClose: () => void
}

export default function ModelSelector({
  currentModelId,
  onModelChange,
  onClose,
}: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState<string>(currentModelId)
  const [cachedModels, setCachedModels] = useState<Set<string>>(new Set())
  const [checkingCache, setCheckingCache] = useState(true)

  useEffect(() => {
    async function checkCachedModels() {
      setCheckingCache(true)
      const cached = new Set<string>()

      for (const model of AVAILABLE_MODELS) {
        const isCached = await isModelCached(model.modelPath)
        if (isCached) {
          cached.add(model.id)
        }
      }

      setCachedModels(cached)
      setCheckingCache(false)
    }

    checkCachedModels()
  }, [])

  const handleConfirm = () => {
    if (selectedModel !== currentModelId) {
      onModelChange(selectedModel)
    }
    onClose()
  }

  const selectedModelConfig = AVAILABLE_MODELS.find((m) => m.id === selectedModel)
  const isSelectedCached = cachedModels.has(selectedModel)
  const needsDownload = selectedModel !== currentModelId && !isSelectedCached

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select AI Model</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Warning */}
          {needsDownload && selectedModelConfig && (
            <Alert variant="default" className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong>{selectedModelConfig.name}</strong> ({selectedModelConfig.size}) needs to be
                downloaded. It will be cached in your browser for future use.
              </AlertDescription>
            </Alert>
          )}

          {/* Cached Info */}
          {!needsDownload && selectedModel !== currentModelId && selectedModelConfig && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>{selectedModelConfig.name}</strong> is already cached. Instant switch!
              </AlertDescription>
            </Alert>
          )}

          {/* Models Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {AVAILABLE_MODELS.map((model) => {
              const isCurrent = currentModelId === model.id
              const isSelected = selectedModel === model.id
              const isCached = cachedModels.has(model.id)

              return (
                <Card
                  key={model.id}
                  className={cn(
                    'relative cursor-pointer p-4 transition-all hover:shadow-md',
                    isSelected && 'ring-2 ring-primary',
                    isCurrent && 'border-primary'
                  )}
                  onClick={() => setSelectedModel(model.id)}
                >
                  {/* Status Badges */}
                  <div className="mb-2 flex items-center gap-2">
                    {isCurrent && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                    {!checkingCache && isCached && !isCurrent && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <CheckCircle className="h-3 w-3" />
                        Cached
                      </Badge>
                    )}
                  </div>

                  {/* Radio Indicator */}
                  <div className="mb-3 flex items-start gap-3">
                    {isSelected ? (
                      <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold">{model.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{model.size}</span>
                        {!checkingCache && !isCached && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              Download needed
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="mb-3 text-sm text-muted-foreground">{model.description}</p>

                  {/* Strengths */}
                  <div className="flex flex-wrap gap-1">
                    {model.strengths.map((strength, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {strength}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedModel === currentModelId}>
            {needsDownload ? 'Download & Use' : isSelectedCached ? 'Switch Model' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
