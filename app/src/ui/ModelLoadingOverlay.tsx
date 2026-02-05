import './ModelLoadingOverlay.css'

interface ModelLoadingOverlayProps {
  modelName: string
  status: string
  progress?: number
}

export default function ModelLoadingOverlay({
  modelName,
  status,
  progress,
}: ModelLoadingOverlayProps) {
  const progressPercent = Math.round((progress || 0) * 100)

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <h3>Loading {modelName}</h3>
        <p className="loading-status">
          {status === 'loading' && 'Initializing model...'}
          {status === 'downloading' && `Downloading model files... ${progressPercent}%`}
          {status === 'ready' && 'Almost ready!'}
        </p>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${Math.max(progressPercent, 5)}%` }}
          ></div>
        </div>
        <p className="loading-note">
          {status === 'ready'
            ? '✓ Model cached in browser'
            : 'First download - cached for future use'}
        </p>
      </div>
    </div>
  )
}
