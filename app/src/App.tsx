import { useEffect } from 'react'
import Layout from './ui/Layout'
import { initializeApp } from './core/init'
import { ThemeProvider } from './components/theme-provider'

function App() {
  useEffect(() => {
    initializeApp()
  }, [])

  return (
    <ThemeProvider defaultTheme="light" storageKey="notebooklm-theme">
      <Layout />
    </ThemeProvider>
  )
}

export default App
