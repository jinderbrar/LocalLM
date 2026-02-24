import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { getBestDevice } from '@/core/deviceDetection'

interface LoadingProgress {
  generation: number // 0-100
  embedding: number // 0-100
}

interface LoadingScreenProps {
  progress: LoadingProgress
  onComplete?: () => void
}

const FACTS = [
  {
    emoji: '🔒',
    title: 'Privacy First',
    text: 'Your AI assistant runs entirely in your browser - no data ever leaves your device!',
  },
  {
    emoji: '💡',
    title: 'Fun Fact',
    text: 'The models you\'re loading can understand context, not just match keywords!',
  },
  {
    emoji: '🌟',
    title: 'Did You Know?',
    text: 'Traditional search finds words. Semantic search understands meaning.',
  },
  {
    emoji: '⚡',
    title: 'Speed Boost',
    text: 'After this first load, the models are cached - next time is instant!',
  },
  {
    emoji: '🧠',
    title: 'Behind the Scenes',
    text: 'Gemma 3 is a lightweight AI model with 270 million parameters from Google!',
  },
  {
    emoji: '🎯',
    title: 'Smart Retrieval',
    text: 'RAG combines searching your docs with AI generation for accurate answers.',
  },
  {
    emoji: '✨',
    title: 'Local Power',
    text: 'This uses WebAssembly to run AI models at near-native speed in your browser.',
  },
  {
    emoji: '📚',
    title: 'Knowledge Stays Private',
    text: 'Unlike cloud AI, your documents and questions never touch a server.',
  },
  {
    emoji: '🚀',
    title: 'Modern Tech',
    text: 'You\'re using transformer models - the same architecture behind ChatGPT!',
  },
  {
    emoji: '🔐',
    title: 'Zero Trust',
    text: 'No API keys, no tracking, no servers. Everything happens on your device.',
  },
  {
    emoji: '🌐',
    title: 'Interesting',
    text: 'Transformers use "attention" mechanisms to understand which words relate to each other.',
  },
  {
    emoji: '💾',
    title: 'Smart Caching',
    text: 'Models are stored in your browser\'s cache - they stay until you clear it!',
  },
]

function LoadingScreen({ progress, onComplete }: LoadingScreenProps) {
  const [currentFactIndex, setCurrentFactIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [device, setDevice] = useState<'webgpu' | 'wasm' | null>(null)

  // Detect device on mount
  useEffect(() => {
    getBestDevice().then(setDevice)
  }, [])

  // Rotate facts every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % FACTS.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Check if loading is complete
  useEffect(() => {
    if (progress.generation === 100 && progress.embedding === 100 && !isComplete) {
      setIsComplete(true)
      // Wait for celebration animation, then dismiss
      setTimeout(() => {
        onComplete?.()
      }, 1500)
    }
  }, [progress, isComplete, onComplete])

  const currentFact = FACTS[currentFactIndex]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950">
      {/* Animated Particles Background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-4 w-full max-w-2xl">
        {/* Title */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="animate-pulse-slow">
              <span className="text-7xl">🧠</span>
            </div>
          </div>
          <h1 className="mb-3 text-3xl font-bold text-white">
            {isComplete ? '✨ Ready to Go!' : 'Loading Your AI Assistant...'}
          </h1>
          <p className="text-slate-300">
            {isComplete
              ? 'All systems ready!'
              : 'Setting up local AI models - this only happens once!'}
          </p>
        </div>

        {/* Progress Bars */}
        <div className="mb-12 space-y-6">
          {/* Generation Model Progress */}
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-200">Gemma 3 270M Model</span>
              <span className="text-slate-400">
                {progress.generation === 100 ? '✓ Ready' : `${Math.round(progress.generation)}%`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  progress.generation === 100
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                )}
                style={{ width: `${progress.generation}%` }}
              />
            </div>
          </div>

          {/* Embedding Model Progress */}
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-200">Embedding Model</span>
              <span className="text-slate-400">
                {progress.embedding === 100 ? '✓ Ready' : `${Math.round(progress.embedding)}%`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  progress.embedding === 100
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                )}
                style={{ width: `${progress.embedding}%` }}
              />
            </div>
          </div>
        </div>

        {/* Facts Carousel */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-8 backdrop-blur-sm">
          <div className="fact-container">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-4xl">{currentFact.emoji}</span>
              <h3 className="text-xl font-semibold text-white">{currentFact.title}</h3>
            </div>
            <p className="text-lg leading-relaxed text-slate-300">{currentFact.text}</p>
          </div>

          {/* Fact Indicators */}
          <div className="mt-6 flex justify-center gap-2">
            {FACTS.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  index === currentFactIndex
                    ? 'w-8 bg-blue-500'
                    : 'w-1.5 bg-slate-600 hover:bg-slate-500'
                )}
              />
            ))}
          </div>
        </div>

        {/* Loading Text */}
        {!isComplete && (
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400">
              Downloading models from HuggingFace...
            </p>
            {device && (
              <p className="mt-2 text-xs text-slate-500">
                {device === 'webgpu' ? '⚡ GPU Acceleration Enabled' : '🔧 CPU Mode (WASM)'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-100vh) scale(1);
            opacity: 0;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.8) 0%, transparent 70%);
          border-radius: 50%;
          animation: float-up linear infinite;
          pointer-events: none;
        }

        .particle:nth-child(odd) {
          background: radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, transparent 70%);
        }

        .particle:nth-child(3n) {
          width: 6px;
          height: 6px;
        }

        .particle:nth-child(5n) {
          width: 3px;
          height: 3px;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .fact-container {
          animation: fadeIn 0.5s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default LoadingScreen
