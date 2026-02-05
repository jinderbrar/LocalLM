import { useEffect } from 'react'
import Layout from './ui/Layout'
import { initializeApp } from './core/init'

function App() {
  useEffect(() => {
    initializeApp()
  }, [])

  return <Layout />
}

export default App
