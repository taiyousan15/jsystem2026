import * as fs from 'fs'
import * as path from 'path'
import { ModelRouter } from '../../src/performance/ModelRouter'
import { CostTracker } from '../../src/performance/CostTracker'
import { CodexCliHelper } from '../../src/performance/CodexCliHelper'
import type {
  ModelSelectionCriteria,
  BudgetConfig,
  RoutingRule,
  ModelType,
  CodexCliRateLimit,
} from '../../src/performance/types'

const TEST_LOG_DIR = path.join(__dirname, '..', '.tmp')
const TEST_ROUTER_LOG_PATH = path.join(TEST_LOG_DIR, 'test-router-cost.jsonl')
const TEST_ROUTER_GLOBAL_LOG_PATH = path.join(TEST_LOG_DIR, 'test-router-global-cost.jsonl')

beforeEach(() => {
  for (const p of [TEST_ROUTER_LOG_PATH, TEST_ROUTER_GLOBAL_LOG_PATH]) {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p)
    }
  }
})

afterAll(() => {
  for (const p of [TEST_ROUTER_LOG_PATH, TEST_ROUTER_GLOBAL_LOG_PATH]) {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p)
    }
  }
})

function createMockCodexCli(options?: {
  installed?: boolean
  usedInWindow?: number
}): CodexCliHelper {
  const installed = options?.installed ?? true
  const usedInWindow = options?.usedInWindow ?? 0
  const cli = new CodexCliHelper(path.join(TEST_LOG_DIR, 'test-codex-usage.jsonl'))

  jest.spyOn(cli, 'isCliInstalled').mockReturnValue(installed)
  jest.spyOn(cli, 'getRateLimit').mockReturnValue({
    usedInWindow,
    maxInWindow: 300,
    windowHours: 5,
    isNearLimit: (usedInWindow / 300) * 100 >= 80,
  })

  return cli
}

function createRouter(overrides?: {
  budgetOverride?: Partial<BudgetConfig>
  preloadCost?: number
  codexCliHelper?: CodexCliHelper
}): ModelRouter {
  const budget: BudgetConfig = {
    monthlyLimit: 50,
    dailyLimit: 5,
    warningThresholdPercent: 80,
    hardLimitAction: 'fallback-to-free',
    ...overrides?.budgetOverride,
  }

  const costTracker = new CostTracker({
    budget,
    logPath: TEST_ROUTER_LOG_PATH,
    globalLogPath: TEST_ROUTER_GLOBAL_LOG_PATH,
    projectId: 'test-router',
  })

  if (overrides?.preloadCost) {
    const tokens = Math.ceil((overrides.preloadCost / 30) * 1_000_000)
    costTracker.recordUsage('claude-opus', 'anthropic-max', tokens, tokens)
  }

  return new ModelRouter({
    costTracker,
    codexCliHelper: overrides?.codexCliHelper,
  })
}

describe('ModelRouter', () => {
  describe('route', () => {
    it('should route trivial tasks to ollama-qwen3-coder', async () => {
      const router = createRouter()
      const criteria: ModelSelectionCriteria = {
        taskComplexity: 'trivial',
      }

      const result = await router.route(criteria)
      expect(result.model).toBe('ollama-qwen3-coder')
      expect(result.provider).toBe('ollama')
    })

    it('should route simple tasks to claude-haiku', async () => {
      const router = createRouter()
      const criteria: ModelSelectionCriteria = {
        taskComplexity: 'simple',
      }

      const result = await router.route(criteria)
      expect(['claude-haiku', 'ollama-qwen3-coder', 'openrouter-free']).toContain(result.model)
    })

    it('should route moderate tasks to claude-sonnet', async () => {
      const router = createRouter()
      const criteria: ModelSelectionCriteria = {
        taskComplexity: 'moderate',
      }

      const result = await router.route(criteria)
      expect(['claude-sonnet', 'claude-haiku', 'ollama-qwen3-coder']).toContain(result.model)
    })

    it('should route expert tasks to claude-opus when API key available', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY
      process.env.ANTHROPIC_API_KEY = 'test-key'

      const router = createRouter()
      router.clearHealthCache()
      const criteria: ModelSelectionCriteria = {
        taskComplexity: 'expert',
      }

      const result = await router.route(criteria)
      expect(['claude-opus', 'claude-sonnet']).toContain(result.model)

      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey
      } else {
        delete process.env.ANTHROPIC_API_KEY
      }
    })

    it('should fall back to free model when over budget', async () => {
      const router = createRouter({
        budgetOverride: { dailyLimit: 0.0001 },
        preloadCost: 1,
      })

      const criteria: ModelSelectionCriteria = {
        taskComplexity: 'expert',
      }

      const result = await router.route(criteria)
      expect(result.model).toBe('ollama-qwen3-coder')
      expect(result.reason).toContain('Budget exceeded')
    })

    it('should include reason in result', async () => {
      const router = createRouter()
      const criteria: ModelSelectionCriteria = {
        taskComplexity: 'trivial',
      }

      const result = await router.route(criteria)
      expect(result.reason).toBeDefined()
      expect(result.reason.length).toBeGreaterThan(0)
    })

    it('should include estimated cost', async () => {
      const router = createRouter()
      const criteria: ModelSelectionCriteria = {
        taskComplexity: 'moderate',
        estimatedTokens: 5000,
      }

      const result = await router.route(criteria)
      expect(typeof result.estimatedCost).toBe('number')
    })

    it('should indicate fallback availability', async () => {
      const router = createRouter()
      const criteria: ModelSelectionCriteria = {
        taskComplexity: 'moderate',
      }

      const result = await router.route(criteria)
      expect(typeof result.fallbackAvailable).toBe('boolean')
    })
  })

  describe('getFallbackModel', () => {
    it('should return next model in fallback chain for opus', () => {
      const router = createRouter()
      const fallback = router.getFallbackModel('claude-opus')
      expect(fallback).toBe('claude-sonnet')
    })

    it('should return gpt53-codex as fallback for sonnet', () => {
      const router = createRouter()
      const fallback = router.getFallbackModel('claude-sonnet')
      expect(fallback).toBe('gpt53-codex')
    })

    it('should return null for last model in chain', () => {
      const router = createRouter()
      const fallback = router.getFallbackModel('openrouter-free')
      expect(fallback).toBeNull()
    })

    it('should return null for unknown model', () => {
      const router = createRouter()
      const fallback = router.getFallbackModel('unknown-model' as ModelType)
      expect(fallback).toBeNull()
    })

    it('should follow the correct chain order', () => {
      const router = createRouter()
      expect(router.getFallbackModel('claude-opus')).toBe('claude-sonnet')
      expect(router.getFallbackModel('claude-sonnet')).toBe('gpt53-codex')
      expect(router.getFallbackModel('gpt53-codex')).toBe('claude-haiku')
      expect(router.getFallbackModel('claude-haiku')).toBe('ollama-qwen3-coder')
      expect(router.getFallbackModel('ollama-qwen3-coder')).toBe('openrouter-free')
      expect(router.getFallbackModel('openrouter-free')).toBeNull()
    })
  })

  describe('checkProviderHealth', () => {
    it('should check anthropic health based on API key', async () => {
      const router = createRouter()
      const originalKey = process.env.ANTHROPIC_API_KEY
      process.env.ANTHROPIC_API_KEY = 'test-key'

      const healthy = await router.checkProviderHealth('anthropic-api')
      expect(healthy).toBe(true)

      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey
      } else {
        delete process.env.ANTHROPIC_API_KEY
      }
    })

    it('should report unhealthy when API key missing', async () => {
      const router = createRouter()
      const originalKey = process.env.ANTHROPIC_API_KEY
      delete process.env.ANTHROPIC_API_KEY

      router.clearHealthCache()
      const healthy = await router.checkProviderHealth('anthropic-api')
      expect(healthy).toBe(false)

      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey
      }
    })

    it('should cache health check results', async () => {
      const router = createRouter()
      const originalKey = process.env.ANTHROPIC_API_KEY
      process.env.ANTHROPIC_API_KEY = 'test-key'

      router.clearHealthCache()
      const first = await router.checkProviderHealth('anthropic-api')
      const second = await router.checkProviderHealth('anthropic-api')
      expect(first).toBe(second)

      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey
      } else {
        delete process.env.ANTHROPIC_API_KEY
      }
    })
  })

  describe('getRoutingRules', () => {
    it('should return all routing rules', () => {
      const router = createRouter()
      const rules = router.getRoutingRules()
      expect(rules.length).toBe(5)
    })

    it('should cover all complexity levels', () => {
      const router = createRouter()
      const rules = router.getRoutingRules()
      const complexities = rules.map((r) => r.taskComplexity)
      expect(complexities).toContain('trivial')
      expect(complexities).toContain('simple')
      expect(complexities).toContain('moderate')
      expect(complexities).toContain('complex')
      expect(complexities).toContain('expert')
    })
  })

  describe('Opus guard', () => {
    it('should downgrade from Opus to Sonnet when Opus daily limit exceeded', async () => {
      const router = createRouter({
        budgetOverride: { opusDailyLimit: 0.001 },
        preloadCost: 1,
      })

      const originalKey = process.env.ANTHROPIC_API_KEY
      process.env.ANTHROPIC_API_KEY = 'test-key'
      router.clearHealthCache()

      const result = await router.route({ taskComplexity: 'expert' })
      expect(result.model).not.toBe('claude-opus')
      expect(['claude-sonnet', 'gpt53-codex', 'claude-haiku']).toContain(result.model)

      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey
      } else {
        delete process.env.ANTHROPIC_API_KEY
      }
    })

    it('should skip Opus in fallback chain when Opus limit exceeded', async () => {
      const router = createRouter({
        budgetOverride: { opusDailyLimit: 0.001 },
        preloadCost: 1,
      })

      const originalKey = process.env.ANTHROPIC_API_KEY
      process.env.ANTHROPIC_API_KEY = 'test-key'
      router.clearHealthCache()

      const result = await router.route({ taskComplexity: 'complex' })
      expect(result.model).not.toBe('claude-opus')

      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey
      } else {
        delete process.env.ANTHROPIC_API_KEY
      }
    })
  })

  describe('suggestCodex', () => {
    it('should suggest Codex CLI for coding tasks when CLI installed', async () => {
      const mockCli = createMockCodexCli({ installed: true, usedInWindow: 10 })
      const router = createRouter({ codexCliHelper: mockCli })
      const origAnthropic = process.env.ANTHROPIC_API_KEY
      process.env.ANTHROPIC_API_KEY = 'test-key'
      router.clearHealthCache()

      const suggestion = await router.suggestCodex(
        {
          taskComplexity: 'moderate',
          taskCategory: 'coding',
          estimatedTokens: 5000,
        },
        'Refactor the auth module'
      )

      expect(suggestion.shouldSuggest).toBe(true)
      expect(suggestion.isCodexAvailable).toBe(true)
      expect(suggestion.codexEstimatedCost).toBe(0)
      expect(suggestion.savingsPercent).toBe(100)
      expect(suggestion.reason).toContain('コーディングタスク検出')
      expect(suggestion.reason).toContain('100%コスト削減')
      expect(suggestion.cliCommand).toContain('codex')
      expect(suggestion.cliRateLimitInfo).toBeDefined()
      expect(suggestion.cliRateLimitInfo!.usedInWindow).toBe(10)

      process.env.ANTHROPIC_API_KEY = origAnthropic ?? ''
      if (!origAnthropic) delete process.env.ANTHROPIC_API_KEY
    })

    it('should suggest Codex for taskType-based coding detection', async () => {
      const mockCli = createMockCodexCli({ installed: true })
      const router = createRouter({ codexCliHelper: mockCli })
      const origAnthropic = process.env.ANTHROPIC_API_KEY
      process.env.ANTHROPIC_API_KEY = 'test-key'
      router.clearHealthCache()

      const suggestion = await router.suggestCodex({
        taskComplexity: 'complex',
        taskType: 'refactor',
      })

      expect(suggestion.shouldSuggest).toBe(true)
      expect(suggestion.isCodexAvailable).toBe(true)

      process.env.ANTHROPIC_API_KEY = origAnthropic ?? ''
      if (!origAnthropic) delete process.env.ANTHROPIC_API_KEY
    })

    it('should not suggest Codex for non-coding tasks', async () => {
      const mockCli = createMockCodexCli({ installed: true })
      const router = createRouter({ codexCliHelper: mockCli })

      const suggestion = await router.suggestCodex({
        taskComplexity: 'moderate',
        taskCategory: 'research',
      })

      expect(suggestion.shouldSuggest).toBe(false)
      expect(suggestion.reason).toContain('コーディングタスクではない')
    })

    it('should not suggest Codex for trivial tasks', async () => {
      const mockCli = createMockCodexCli({ installed: true })
      const router = createRouter({ codexCliHelper: mockCli })

      const suggestion = await router.suggestCodex({
        taskComplexity: 'trivial',
        taskCategory: 'coding',
      })

      expect(suggestion.shouldSuggest).toBe(false)
      expect(suggestion.reason).toContain('複雑度が低い')
    })

    it('should not suggest when Codex CLI is not installed', async () => {
      const mockCli = createMockCodexCli({ installed: false })
      const router = createRouter({ codexCliHelper: mockCli })

      const suggestion = await router.suggestCodex({
        taskComplexity: 'moderate',
        taskCategory: 'coding',
      })

      expect(suggestion.shouldSuggest).toBe(false)
      expect(suggestion.isCodexAvailable).toBe(false)
      expect(suggestion.reason).toContain('Codex CLIが未インストール')
    })

    it('should not suggest when rate limit is near', async () => {
      const mockCli = createMockCodexCli({ installed: true, usedInWindow: 250 })
      const router = createRouter({ codexCliHelper: mockCli })
      const origAnthropic = process.env.ANTHROPIC_API_KEY
      process.env.ANTHROPIC_API_KEY = 'test-key'
      router.clearHealthCache()

      const suggestion = await router.suggestCodex({
        taskComplexity: 'moderate',
        taskCategory: 'coding',
      })

      expect(suggestion.shouldSuggest).toBe(false)
      expect(suggestion.reason).toContain('レート制限')

      process.env.ANTHROPIC_API_KEY = origAnthropic ?? ''
      if (!origAnthropic) delete process.env.ANTHROPIC_API_KEY
    })
  })

  describe('routeWithOverride', () => {
    it('should route to manually specified model when available', async () => {
      const router = createRouter()
      const origOpenai = process.env.OPENAI_API_KEY
      process.env.OPENAI_API_KEY = 'test-key'
      router.clearHealthCache()

      const result = await router.routeWithOverride('gpt53-codex', {
        taskComplexity: 'moderate',
        estimatedTokens: 5000,
      })

      expect(result.model).toBe('gpt53-codex')
      expect(result.reason).toContain('Manual override')
      expect(result.reason).toContain('gpt53-codex')

      process.env.OPENAI_API_KEY = origOpenai ?? ''
      if (!origOpenai) delete process.env.OPENAI_API_KEY
    })

    it('should fallback when manually specified model is unavailable', async () => {
      const router = createRouter()
      const origOpenai = process.env.OPENAI_API_KEY
      delete process.env.OPENAI_API_KEY
      router.clearHealthCache()

      const result = await router.routeWithOverride('gpt53-codex')

      expect(result.model).not.toBe('gpt53-codex')
      expect(result.reason).toContain('unavailable')

      if (origOpenai) process.env.OPENAI_API_KEY = origOpenai
    })

    it('should allow override to any model type', async () => {
      const router = createRouter()
      const origKey = process.env.ANTHROPIC_API_KEY
      process.env.ANTHROPIC_API_KEY = 'test-key'
      router.clearHealthCache()

      const result = await router.routeWithOverride('claude-opus')

      expect(result.model).toBe('claude-opus')
      expect(result.reason).toContain('Manual override')

      process.env.ANTHROPIC_API_KEY = origKey ?? ''
      if (!origKey) delete process.env.ANTHROPIC_API_KEY
    })
  })

  describe('OpenAI provider health', () => {
    it('should check OpenAI provider health', async () => {
      const router = createRouter()
      const originalKey = process.env.OPENAI_API_KEY
      process.env.OPENAI_API_KEY = 'test-key'
      router.clearHealthCache()

      const healthy = await router.checkProviderHealth('openai')
      expect(healthy).toBe(true)

      delete process.env.OPENAI_API_KEY
      router.clearHealthCache()

      const unhealthy = await router.checkProviderHealth('openai')
      expect(unhealthy).toBe(false)

      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey
      }
    })
  })

  describe('route should NOT auto-route to Codex', () => {
    it('should not automatically route coding tasks to Codex', async () => {
      const router = createRouter()
      const origAnthropic = process.env.ANTHROPIC_API_KEY
      const origOpenai = process.env.OPENAI_API_KEY
      process.env.ANTHROPIC_API_KEY = 'test-key'
      process.env.OPENAI_API_KEY = 'test-key'
      router.clearHealthCache()

      const result = await router.route({
        taskComplexity: 'moderate',
        taskCategory: 'coding',
      })

      // route() は Codex に自動切り替えしない（Sonnetが選ばれるはず）
      expect(result.model).not.toBe('gpt53-codex')
      expect(result.model).toBe('claude-sonnet')

      process.env.ANTHROPIC_API_KEY = origAnthropic ?? ''
      process.env.OPENAI_API_KEY = origOpenai ?? ''
      if (!origAnthropic) delete process.env.ANTHROPIC_API_KEY
      if (!origOpenai) delete process.env.OPENAI_API_KEY
    })
  })

  describe('clearHealthCache', () => {
    it('should clear cached health status', async () => {
      const router = createRouter()
      await router.checkProviderHealth('anthropic-api')
      router.clearHealthCache()
      // After clearing, the next check should re-evaluate
      const healthy = await router.checkProviderHealth('anthropic-api')
      expect(typeof healthy).toBe('boolean')
    })
  })
})
