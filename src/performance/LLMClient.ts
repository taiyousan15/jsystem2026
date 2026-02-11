import { spawnSync } from 'child_process'
import type {
  ModelType,
  ProviderType,
  ModelSelectionCriteria,
  LLMRequest,
  LLMResponse,
} from './types'
import { ModelRouter } from './ModelRouter'
import { CostTracker } from './CostTracker'

const OLLAMA_DEFAULT_URL = 'http://localhost:11434'
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const REQUEST_TIMEOUT_MS = 120_000

const MODEL_API_IDS: Record<ModelType, string> = {
  'claude-opus': 'claude-opus-4-6',
  'claude-sonnet': 'claude-sonnet-4-5-20250929',
  'claude-haiku': 'claude-haiku-4-5-20251001',
  'ollama-qwen3-coder': 'qwen3-coder:30b',
  'ollama-glm4': 'glm4',
  'openrouter-free': 'auto',
  'gpt53-codex': 'gpt53-codex',
}

interface LLMClientOptions {
  readonly router?: ModelRouter
  readonly costTracker?: CostTracker
  readonly ollamaUrl?: string
  readonly anthropicApiKey?: string
  readonly openRouterApiKey?: string
  readonly timeoutMs?: number
}

export class LLMClient {
  private readonly router: ModelRouter
  private readonly costTracker: CostTracker
  private readonly ollamaUrl: string
  private readonly timeoutMs: number

  constructor(options: LLMClientOptions = {}) {
    this.costTracker = options.costTracker ?? new CostTracker()
    this.router = options.router ?? new ModelRouter({ costTracker: this.costTracker })
    this.ollamaUrl = options.ollamaUrl ?? OLLAMA_DEFAULT_URL
    this.timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS
  }

  async complete(
    request: LLMRequest,
    criteria: ModelSelectionCriteria
  ): Promise<LLMResponse> {
    const routingResult = await this.router.route(criteria)
    const { model, provider } = routingResult

    try {
      const response = await this.callProvider(provider, model, request)

      this.costTracker.recordUsage(
        model,
        provider,
        response.inputTokens,
        response.outputTokens,
        0,
        criteria.taskType
      )

      return response
    } catch (error) {
      const fallbackModel = this.router.getFallbackModel(model)
      if (fallbackModel) {
        const fallbackProvider = this.getProviderForModel(fallbackModel)
        const fallbackResponse = await this.callProvider(
          fallbackProvider,
          fallbackModel,
          request
        )

        this.costTracker.recordUsage(
          fallbackModel,
          fallbackProvider,
          fallbackResponse.inputTokens,
          fallbackResponse.outputTokens,
          0,
          criteria.taskType
        )

        return fallbackResponse
      }

      throw new Error(
        `LLM call failed for ${model} and no fallback available: ${(error as Error).message}`
      )
    }
  }

  async completeWithModel(
    model: ModelType,
    request: LLMRequest
  ): Promise<LLMResponse> {
    const provider = this.getProviderForModel(model)
    const response = await this.callProvider(provider, model, request)

    this.costTracker.recordUsage(
      model,
      provider,
      response.inputTokens,
      response.outputTokens
    )

    return response
  }

  private async callProvider(
    provider: ProviderType,
    model: ModelType,
    request: LLMRequest
  ): Promise<LLMResponse> {
    const startTime = Date.now()

    switch (provider) {
      case 'anthropic-max':
      case 'anthropic-api':
        return this.callAnthropic(model, request, startTime)
      case 'ollama':
        return this.callOllama(model, request, startTime)
      case 'openrouter':
        return this.callOpenRouter(model, request, startTime)
      case 'openai':
        return this.executeCodexCli(request, startTime)
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  private async callAnthropic(
    model: ModelType,
    request: LLMRequest,
    startTime: number
  ): Promise<LLMResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set')
    }

    const modelId = MODEL_API_IDS[model]
    const messages = [{ role: 'user' as const, content: request.prompt }]

    const body: Record<string, unknown> = {
      model: modelId,
      max_tokens: request.maxTokens ?? 4096,
      messages,
    }

    if (request.systemPrompt) {
      body.system = request.systemPrompt
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Anthropic API error ${response.status}: ${errorText}`)
      }

      const data = await response.json() as {
        content: Array<{ type: string; text: string }>
        usage: { input_tokens: number; output_tokens: number }
      }

      const content = data.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')

      return {
        content,
        model,
        provider: model === 'claude-opus' ? 'anthropic-max' : 'anthropic-api',
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        latencyMs: Date.now() - startTime,
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  private async callOllama(
    model: ModelType,
    request: LLMRequest,
    startTime: number
  ): Promise<LLMResponse> {
    const modelId = MODEL_API_IDS[model]
    const messages: Array<{ role: string; content: string }> = []

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt })
    }
    messages.push({ role: 'user', content: request.prompt })

    const body = {
      model: modelId,
      messages,
      stream: false,
      options: {
        temperature: request.temperature ?? 0.7,
        num_predict: request.maxTokens ?? 4096,
      },
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ollama API error ${response.status}: ${errorText}`)
      }

      const data = await response.json() as {
        message: { content: string }
        prompt_eval_count?: number
        eval_count?: number
      }

      return {
        content: data.message.content,
        model,
        provider: 'ollama',
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
        latencyMs: Date.now() - startTime,
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  private async callOpenRouter(
    model: ModelType,
    request: LLMRequest,
    startTime: number
  ): Promise<LLMResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not set')
    }

    const messages: Array<{ role: string; content: string }> = []

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt })
    }
    messages.push({ role: 'user', content: request.prompt })

    const body = {
      model: MODEL_API_IDS[model],
      messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/taiyousan15/jsystem2026',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API error ${response.status}: ${errorText}`)
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>
        usage: { prompt_tokens: number; completion_tokens: number }
      }

      return {
        content: data.choices[0]?.message?.content ?? '',
        model,
        provider: 'openrouter',
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        latencyMs: Date.now() - startTime,
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  private executeCodexCli(
    request: LLMRequest,
    startTime: number
  ): Promise<LLMResponse> {
    return new Promise((resolve, reject) => {
      const result = spawnSync('codex', [request.prompt], {
        encoding: 'utf-8',
        timeout: this.timeoutMs,
        env: { ...process.env },
      })

      if (result.error) {
        reject(new Error(`Codex CLI error: ${result.error.message}`))
        return
      }

      if (result.status !== 0) {
        reject(new Error(`Codex CLI exit code ${result.status}: ${result.stderr}`))
        return
      }

      resolve({
        content: result.stdout.trim(),
        model: 'gpt53-codex',
        provider: 'openai',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startTime,
      })
    })
  }

  private getProviderForModel(model: ModelType): ProviderType {
    const map: Record<ModelType, ProviderType> = {
      'claude-opus': 'anthropic-max',
      'claude-sonnet': 'anthropic-api',
      'claude-haiku': 'anthropic-api',
      'ollama-qwen3-coder': 'ollama',
      'ollama-glm4': 'ollama',
      'openrouter-free': 'openrouter',
      'gpt53-codex': 'openai',
    }
    return map[model]
  }
}
