/**
 * Detect and select the best available compute device
 */
export async function detectBestDevice(): Promise<'webgpu' | 'wasm'> {
  console.log('🔍 Detecting compute device...')

  try {
    // Check if WebGPU is available
    if ('gpu' in navigator) {
      console.log('🔍 WebGPU API found, requesting adapter...')
      const adapter = await (navigator as any).gpu.requestAdapter()

      if (adapter) {
        const adapterInfo = await adapter.requestAdapterInfo?.()
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('✅ WebGPU ENABLED - GPU Acceleration Active!')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('🎮 Compute Method: GPU (WebGPU)')
        console.log('⚡ Performance: 5-10x faster than CPU')
        console.log('🔧 Precision: fp32 (full precision)')
        if (adapterInfo) {
          console.log(`🎯 GPU: ${adapterInfo.description || 'Unknown'}`)
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        return 'webgpu'
      } else {
        console.warn('⚠️ WebGPU API exists but no adapter available')
      }
    } else {
      console.warn('⚠️ WebGPU API not found in navigator')
    }
  } catch (error) {
    console.error('❌ WebGPU detection error:', error)
  }

  // WebGPU not available - use WASM fallback
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('ℹ️ WebGPU NOT SUPPORTED - Using WASM Fallback')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔧 Compute Method: CPU (WebAssembly)')
  console.log('📊 Performance: Slower but works everywhere')
  console.log('🔧 Precision: fp32 (full precision)')
  console.log('💡 For faster performance:')
  console.log('   • Use Chrome/Edge 113+ on Windows/Mac')
  console.log('   • Ensure GPU drivers are up to date')
  console.log('   • Enable "Unsafe WebGPU" in chrome://flags if needed')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  return 'wasm'
}

let cachedDevice: 'webgpu' | 'wasm' | null = null

/**
 * Get the best available device (cached after first call)
 */
export async function getBestDevice(): Promise<'webgpu' | 'wasm'> {
  if (cachedDevice) {
    console.log(`📌 Using cached device: ${cachedDevice === 'webgpu' ? 'GPU (WebGPU)' : 'CPU (WASM)'}`)
    return cachedDevice
  }
  cachedDevice = await detectBestDevice()
  return cachedDevice
}
