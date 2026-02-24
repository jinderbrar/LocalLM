/**
 * Shared types for all strategy interfaces
 */

export interface ConfigField {
  key: string
  label: string
  type: 'number' | 'slider' | 'select' | 'toggle'
  default: any
  min?: number
  max?: number
  step?: number
  options?: Array<{ label: string; value: any }>
  description?: string
}

export interface ConfigSchema {
  fields: ConfigField[]
}

export type StrategyConfig = Record<string, any>
