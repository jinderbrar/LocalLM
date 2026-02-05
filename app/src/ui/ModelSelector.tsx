import { useState, useEffect } from 'react'
import { AVAILABLE_MODELS, isModelCached, type ModelConfig } from '../core/generate'
import './ModelSelector.css'

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

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === currentModelId)
  const selectedModelConfig = AVAILABLE_MODELS.find((m) => m.id === selectedModel)
  const isSelectedCached = cachedModels.has(selectedModel)
  const needsDownload = selectedModel !== currentModelId && !isSelectedCached

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Select AI Model</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {needsDownload && selectedModelConfig && (
            <div className="download-warning">
              <span className="warning-icon">⚠️</span>
              <div className="warning-text">
                <strong>{selectedModelConfig.name}</strong> ({selectedModelConfig.size}) needs to be
                downloaded. It will be cached in your browser for future use.
              </div>
            </div>
          )}

          {!needsDownload && selectedModel !== currentModelId && selectedModelConfig && (
            <div className="cached-info">
              <span className="info-icon">✓</span>
              <div className="info-text">
                <strong>{selectedModelConfig.name}</strong> is already cached. Instant switch!
              </div>
            </div>
          )}

          <div className="models-grid">
            {AVAILABLE_MODELS.map((model) => {
              const isCurrent = currentModelId === model.id
              const isSelected = selectedModel === model.id
              const isCached = cachedModels.has(model.id)

              return (
                <div
                  key={model.id}
                  className={`model-card ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                  onClick={() => setSelectedModel(model.id)}
                >
                  {isCurrent && <div className="current-badge">Current</div>}
                  {!checkingCache && isCached && !isCurrent && (
                    <div className="cached-badge">✓ Cached</div>
                  )}
                  <div className="model-radio">{isSelected ? '●' : '○'}</div>
                  <h4 className="model-title">{model.name}</h4>
                  <div className="model-size">
                    {model.size}
                    {!checkingCache && !isCached && (
                      <span className="download-indicator"> • Download needed</span>
                    )}
                  </div>
                  <p className="model-description">{model.description}</p>
                  <div className="model-strengths">
                    {model.strengths.map((strength, idx) => (
                      <span key={idx} className="strength-badge">
                        {strength}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={selectedModel === currentModelId}
          >
            {needsDownload ? `Download & Use` : isSelectedCached ? 'Switch Model' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
