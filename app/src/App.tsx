import { useEffect, useState } from 'react'
import Layout from './ui/Layout'
import LoadingScreen from './ui/LoadingScreen'
import { initializeApp } from './core/init'
import { modelProgressTracker } from './core/modelProgress'
import { ThemeProvider } from './components/theme-provider'

function App() {
  const [progress, setProgress] = useState({ generation: 0, embedding: 0 })
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Subscribe to progress updates
    const unsubscribe = modelProgressTracker.subscribe((newProgress) => {
      setProgress(newProgress)

      // Check if both models are ready
      if (newProgress.generation === 100 && newProgress.embedding === 100) {
        // Small delay to show completion animation
        setTimeout(() => {
          setIsReady(true)
        }, 1500)
      }
    })

    // Initialize app (starts model loading)
    initializeApp()

    return unsubscribe
  }, [])

  return (
    <ThemeProvider defaultTheme="light" storageKey="notebooklm-theme">
      {!isReady && <LoadingScreen progress={progress} />}
      {isReady && <Layout />}
    </ThemeProvider>
  )
}

export default App
