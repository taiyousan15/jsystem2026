export type ModelType =
  | 'claude-opus'
  | 'claude-sonnet'
  | 'claude-haiku'
  | 'ollama-qwen3-coder'
  | 'ollama-glm4'
  | 'openrouter-free'
  | 'gpt53-codex'

export type ProviderType =
  | 'anthropic-max'
  | 'anthropic-api'
  | 'ollama'
  | 'openrouter'
  | 'openai'

export type TaskComplexity =
  | 'trivial'
  | 'simple'
  | 'moderate'
  | 'complex'
  | 'expert'

export interface ProviderConfig {
  readonly name: ProviderType
  readonly priority: number
  readonly baseUrl: string
  readonly apiKeyEnv?: string
  readonly enabled: boolean
  readonly healthEndpoint?: string
}

export interface ModelCost {
  readonly inputPerMillion: number
  readonly outputPerMillion: number
  readonly cachedInputPerMillion?: number
}

export interface ModelConfig {
  readonly id: string
  readonly provider: ProviderType
  readonly displayName: string
  readonly cost: ModelCost
  readonly maxTokens: number
  readonly supportsCaching?: boolean
}

export interface RoutingRule {
  readonly taskComplexity: TaskComplexity
  readonly preferredModel: ModelType
  readonly fallbackModels: readonly ModelType[]
  readonly maxCostPerRequest?: number
}

export interface BudgetConfig {
  readonly monthlyLimit: number
  readonly dailyLimit: number
  readonly warningThresholdPercent: number
  readonly hardLimitAction: 'fallback-to-free' | 'block' | 'warn'
  readonly globalMonthlyLimit?: number
  readonly globalDailyLimit?: number
  readonly opusDailyLimit?: number
  readonly opusMonthlyLimit?: number
}

export interface CostRecord {
  readonly timestamp: string
  readonly model: ModelType
  readonly provider: ProviderType
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cachedTokens: number
  readonly cost: number
  readonly taskType?: string
  readonly projectId?: string
}

export interface BudgetStatus {
  readonly isOverBudget: boolean
  readonly dailySpend: number
  readonly monthlySpend: number
  readonly dailyRemaining: number
  readonly monthlyRemaining: number
  readonly percentUsed: number
  readonly globalDailySpend?: number
  readonly globalMonthlySpend?: number
  readonly isGlobalOverBudget?: boolean
  readonly opusDailySpend?: number
  readonly isOpusOverLimit?: boolean
}

export type TaskCategory = 'coding' | 'research' | 'analysis' | 'writing' | 'general'

export interface ModelSelectionCriteria {
  readonly taskComplexity: TaskComplexity
  readonly taskType?: string
  readonly taskCategory?: TaskCategory
  readonly estimatedTokens?: number
  readonly requiresStreaming?: boolean
  readonly requiresCaching?: boolean
}

export interface ModelRoutingResult {
  readonly model: ModelType
  readonly provider: ProviderType
  readonly reason: string
  readonly estimatedCost: number
  readonly fallbackAvailable: boolean
}

export interface CodexSuggestion {
  readonly shouldSuggest: boolean
  readonly reason: string
  readonly currentModel: ModelType
  readonly currentEstimatedCost: number
  readonly codexEstimatedCost: number
  readonly savingsPercent: number
  readonly isCodexAvailable: boolean
  readonly cliCommand?: string
  readonly cliRateLimitInfo?: CodexCliRateLimit
}

export interface CodexCliRateLimit {
  readonly usedInWindow: number
  readonly maxInWindow: number
  readonly windowHours: number
  readonly isNearLimit: boolean
}

export interface ModelRoutingConfig {
  readonly providers: readonly ProviderConfig[]
  readonly models: Record<ModelType, ModelConfig>
  readonly routingRules: readonly RoutingRule[]
  readonly budget: BudgetConfig
  readonly fallbackChain: readonly ModelType[]
}

export interface CostReport {
  readonly period: 'day' | 'week' | 'month'
  readonly totalCost: number
  readonly byModel: Record<string, number>
  readonly byProvider: Record<string, number>
  readonly requestCount: number
  readonly averageCostPerRequest: number
  readonly budgetStatus: BudgetStatus
}
