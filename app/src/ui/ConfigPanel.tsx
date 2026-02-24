import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Settings,
  CheckCircle2,
  RotateCcw,
  Download,
  Upload,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

import { ConfigManager, getAllPresets } from '../core/config'
import type { RAGConfig } from '../core/config/types'
import {
  ChunkingRegistry,
  EmbeddingRegistry,
  RetrievalRegistry,
  GenerationRegistry,
  PostProcessRegistry,
} from '../core/strategies'
import type { ConfigField } from '../core/strategies/types'
import { getPipeline } from '../core/init'

export default function ConfigPanel() {
  const [config, setConfig] = useState<RAGConfig>(ConfigManager.getConfig())
  const [hasChanges, setHasChanges] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [currentPreset, setCurrentPreset] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    // Check if config differs from saved
    const savedConfig = ConfigManager.getConfig()
    const isDifferent = JSON.stringify(config) !== JSON.stringify(savedConfig)
    setHasChanges(isDifferent)

    // Check if matches a preset
    const presets = getAllPresets()
    const matchingPreset = presets.find(
      (p) => JSON.stringify(p.config) === JSON.stringify(config)
    )
    setCurrentPreset(matchingPreset?.id || null)
  }, [config])

  const handlePresetChange = (presetId: string) => {
    const presets = getAllPresets()
    const preset = presets.find((p) => p.id === presetId)
    if (preset) {
      setConfig(preset.config)
      setCurrentPreset(presetId)
      setSaveSuccess(false)
    }
  }

  const handleSave = () => {
    ConfigManager.saveConfig(config)
    setHasChanges(false)
    setSaveSuccess(true)

    // Update pipeline config
    const pipeline = getPipeline()
    pipeline.setConfig(config)

    // Validate
    const validation = pipeline.validateConfig()
    if (!validation.valid) {
      console.error('⚠️ Invalid configuration:', validation.errors)
    }

    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleReset = () => {
    const savedConfig = ConfigManager.getConfig()
    setConfig(savedConfig)
    setSaveSuccess(false)
  }

  const handleExport = () => {
    const json = ConfigManager.exportConfig()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rag-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string
        const success = ConfigManager.importConfig(json)
        if (success) {
          setConfig(ConfigManager.getConfig())
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 3000)
        } else {
          alert('Invalid configuration file')
        }
      } catch (error) {
        alert('Failed to import configuration')
      }
    }
    reader.readAsText(file)
  }

  // Get strategy info for warnings
  const retrievalStrategy = RetrievalRegistry.get(config.retrieval.strategyId)
  const requiresEmbeddings = retrievalStrategy?.requiresEmbeddings || false

  return (
    <div className="flex h-full max-h-[85vh] flex-col gap-4 overflow-auto p-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">RAG Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Configure your retrieval-augmented generation pipeline
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('import-config')?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <input
              id="import-config"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </div>

        {/* Current Preset Indicator */}
        {currentPreset && !hasChanges && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Using <span className="font-medium">{currentPreset}</span> preset
          </div>
        )}
      </div>

      {/* Save Banner */}
      {saveSuccess && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Configuration saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Important Info */}
      {requiresEmbeddings && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Embeddings Required</AlertTitle>
          <AlertDescription>
            {config.retrieval.strategyId === 'semantic' || config.retrieval.strategyId === 'hybrid'
              ? 'Semantic search requires embeddings. First-time use: ~30s to load MiniLM model.'
              : 'This retrieval strategy requires embeddings to be generated for your documents.'}
          </AlertDescription>
        </Alert>
      )}

      {config.retrieval.strategyId === 'bm25' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>BM25 Search Limitations</AlertTitle>
          <AlertDescription>
            Lexical search works best for exact keyword matches. Consider using <strong>Hybrid</strong> search
            for better results with conceptual questions.
          </AlertDescription>
        </Alert>
      )}

      {/* Presets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Quick Start Presets
          </CardTitle>
          <CardDescription className="text-xs">
            Choose a preset optimized for your needs. These match the search modes in Chat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              variant={currentPreset === 'fast' && !hasChanges ? 'default' : 'outline'}
              className="h-auto flex-col gap-2 py-3"
              onClick={() => handlePresetChange('fast')}
            >
              <span className="text-2xl">⚡</span>
              <div className="space-y-0.5">
                <div className="text-sm font-semibold">Fast</div>
                <div className="text-xs text-muted-foreground">
                  Keyword search • Instant
                </div>
              </div>
            </Button>
            <Button
              variant={currentPreset === 'balanced' && !hasChanges ? 'default' : 'outline'}
              className="h-auto flex-col gap-2 py-3"
              onClick={() => handlePresetChange('balanced')}
            >
              <span className="text-2xl">🎯</span>
              <div className="space-y-0.5">
                <div className="text-sm font-semibold">Balanced</div>
                <div className="text-xs text-muted-foreground">
                  Best overall • Recommended
                </div>
              </div>
            </Button>
            <Button
              variant={currentPreset === 'accurate' && !hasChanges ? 'default' : 'outline'}
              className="h-auto flex-col gap-2 py-3"
              onClick={() => handlePresetChange('accurate')}
            >
              <span className="text-2xl">🧠</span>
              <div className="space-y-0.5">
                <div className="text-sm font-semibold">Accurate</div>
                <div className="text-xs text-muted-foreground">
                  Deep understanding
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Configuration - Collapsible */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          className="w-full justify-between"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <div className="flex items-center gap-2">
            {showAdvanced ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="font-semibold">Advanced Configuration</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            Optional
          </Badge>
        </Button>

        {showAdvanced && (
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">
                Fine-tune each stage of the RAG pipeline for power users
              </CardDescription>
            </CardHeader>
            <CardContent>
          <Tabs defaultValue="retrieval" className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
              <TabsTrigger value="retrieval" className="text-xs">
                Retrieval
              </TabsTrigger>
              <TabsTrigger value="generation" className="text-xs">
                Generation
              </TabsTrigger>
              <TabsTrigger value="postprocess" className="text-xs">
                Polish
              </TabsTrigger>
              <TabsTrigger value="chunking" className="text-xs">
                Chunking
              </TabsTrigger>
              <TabsTrigger value="embedding" className="text-xs">
                Embedding
              </TabsTrigger>
            </TabsList>

            {/* Retrieval Tab - MOST IMPORTANT */}
            <TabsContent value="retrieval" className="space-y-4">
              <StrategySelector
                label="Retrieval Strategy"
                strategies={RetrievalRegistry.getAll()}
                selectedId={config.retrieval.strategyId}
                onSelect={(id) =>
                  setConfig({
                    ...config,
                    retrieval: { strategyId: id, config: {} },
                  })
                }
              />
              <Separator />
              <ConfigFields
                strategy={RetrievalRegistry.get(config.retrieval.strategyId)}
                config={config.retrieval.config}
                onChange={(newConfig) =>
                  setConfig({
                    ...config,
                    retrieval: { ...config.retrieval, config: newConfig },
                  })
                }
              />
            </TabsContent>

            {/* Generation Tab */}
            <TabsContent value="generation" className="space-y-4">
              <StrategySelector
                label="Generation Strategy"
                strategies={GenerationRegistry.getAll()}
                selectedId={config.generation.strategyId}
                onSelect={(id) =>
                  setConfig({
                    ...config,
                    generation: { strategyId: id, config: {} },
                  })
                }
              />
              <Separator />
              <ConfigFields
                strategy={GenerationRegistry.get(config.generation.strategyId)}
                config={config.generation.config}
                onChange={(newConfig) =>
                  setConfig({
                    ...config,
                    generation: { ...config.generation, config: newConfig },
                  })
                }
              />
            </TabsContent>

            {/* Post-Process Tab */}
            <TabsContent value="postprocess" className="space-y-4">
              {config.postProcess.map((pp, index) => {
                const strategy = PostProcessRegistry.get(pp.strategyId)
                return (
                  <div key={pp.strategyId} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">
                        {strategy?.name || pp.strategyId}
                      </Label>
                    </div>
                    <ConfigFields
                      strategy={strategy}
                      config={pp.config}
                      onChange={(newConfig) => {
                        const newPostProcess = [...config.postProcess]
                        newPostProcess[index] = {
                          ...newPostProcess[index],
                          config: newConfig,
                        }
                        setConfig({ ...config, postProcess: newPostProcess })
                      }}
                    />
                  </div>
                )
              })}
            </TabsContent>

            {/* Chunking Tab */}
            <TabsContent value="chunking" className="space-y-4">
              <StrategySelector
                label="Chunking Strategy"
                strategies={ChunkingRegistry.getAll()}
                selectedId={config.chunking.strategyId}
                onSelect={(id) =>
                  setConfig({
                    ...config,
                    chunking: { strategyId: id, config: {} },
                  })
                }
              />
              <Separator />
              <ConfigFields
                strategy={ChunkingRegistry.get(config.chunking.strategyId)}
                config={config.chunking.config}
                onChange={(newConfig) =>
                  setConfig({
                    ...config,
                    chunking: { ...config.chunking, config: newConfig },
                  })
                }
              />
            </TabsContent>

            {/* Embedding Tab */}
            <TabsContent value="embedding" className="space-y-4">
              <StrategySelector
                label="Embedding Strategy"
                strategies={EmbeddingRegistry.getAll()}
                selectedId={config.embedding.strategyId}
                onSelect={(id) =>
                  setConfig({
                    ...config,
                    embedding: { strategyId: id, config: {} },
                  })
                }
              />
              <Separator />
              <ConfigFields
                strategy={EmbeddingRegistry.get(config.embedding.strategyId)}
                config={config.embedding.config}
                onChange={(newConfig) =>
                  setConfig({
                    ...config,
                    embedding: { ...config.embedding, config: newConfig },
                  })
                }
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <div className="flex gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="px-3 py-1">
              Unsaved changes
            </Badge>
          )}
          <Button onClick={handleSave} disabled={!hasChanges}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  )
}

// Helper component for strategy selection
function StrategySelector({
  label,
  strategies,
  selectedId,
  onSelect,
}: {
  label: string
  strategies: any[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const selected = strategies.find((s) => s.id === selectedId)

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={selectedId} onValueChange={onSelect}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span className="truncate">{selected?.name || selectedId}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {strategies.map((strategy) => (
            <SelectItem key={strategy.id} value={strategy.id} className="cursor-pointer">
              <div className="flex flex-col gap-0.5 py-1">
                <div className="font-medium">{strategy.name}</div>
                {strategy.description && (
                  <div className="max-w-xs text-xs text-muted-foreground line-clamp-2">
                    {strategy.description}
                  </div>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected?.description && (
        <p className="text-xs text-muted-foreground">{selected.description}</p>
      )}
    </div>
  )
}

// Helper component for rendering config fields
function ConfigFields({
  strategy,
  config,
  onChange,
}: {
  strategy: any
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}) {
  if (!strategy) return null

  const fields = strategy.configSchema?.fields || []

  if (fields.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center">
        <p className="text-sm text-muted-foreground">
          No configuration options available for this strategy.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {fields.map((field: ConfigField) => (
        <div key={field.key} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={field.key} className="text-sm font-medium">
              {field.label}
            </Label>
            {field.type === 'slider' && (
              <Badge variant="secondary" className="font-mono text-xs">
                {config[field.key] ?? field.default}
              </Badge>
            )}
          </div>

          {field.type === 'slider' && (
            <Slider
              id={field.key}
              value={[config[field.key] ?? field.default]}
              min={field.min}
              max={field.max}
              step={field.step}
              onValueChange={([v]) => onChange({ ...config, [field.key]: v })}
              className="py-2"
            />
          )}

          {field.type === 'select' && (
            <Select
              value={String(config[field.key] ?? field.default)}
              onValueChange={(v) => onChange({ ...config, [field.key]: v })}
            >
              <SelectTrigger id={field.key}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {field.type === 'toggle' && (
            <div className="flex items-center gap-3 rounded-md border p-3">
              <Switch
                id={field.key}
                checked={config[field.key] ?? field.default}
                onCheckedChange={(checked) => onChange({ ...config, [field.key]: checked })}
              />
              <Label htmlFor={field.key} className="cursor-pointer text-sm">
                {config[field.key] ?? field.default ? 'Enabled' : 'Disabled'}
              </Label>
            </div>
          )}

          {field.description && (
            <p className="text-xs leading-relaxed text-muted-foreground">{field.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}
