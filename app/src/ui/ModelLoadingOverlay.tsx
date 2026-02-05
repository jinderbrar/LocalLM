import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle2 } from 'lucide-react'

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

  const getStatusText = () => {
    switch (status) {
      case 'loading':
        return 'Initializing model...'
      case 'downloading':
        return `Downloading model files... ${progressPercent}%`
      case 'ready':
        return 'Almost ready!'
      default:
        return 'Loading...'
    }
  }

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" hideClose>
        <div className="flex flex-col items-center space-y-4 py-4">
          {/* Spinner */}
          <div className="flex h-16 w-16 items-center justify-center">
            {status === 'ready' ? (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            ) : (
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            )}
          </div>

          {/* Model Name */}
          <h3 className="text-lg font-semibold">Loading {modelName}</h3>

          {/* Status Text */}
          <p className="text-sm text-muted-foreground">{getStatusText()}</p>

          {/* Progress Bar */}
          <div className="w-full">
            <Progress value={Math.max(progressPercent, 5)} className="h-2" />
          </div>

          {/* Note */}
          <p className="text-xs text-muted-foreground">
            {status === 'ready'
              ? '✓ Model cached in browser'
              : 'First download - cached for future use'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
