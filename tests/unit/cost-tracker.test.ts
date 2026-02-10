import * as fs from 'fs'
import * as path from 'path'
import { CostTracker } from '../../src/performance/CostTracker'
import type { ModelType, ProviderType, BudgetConfig, ModelCost } from '../../src/performance/types'

const TEST_LOG_DIR = path.join(__dirname, '..', '.tmp')
const TEST_LOG_PATH = path.join(TEST_LOG_DIR, 'test-cost-tracking.jsonl')
const TEST_GLOBAL_LOG_PATH = path.join(TEST_LOG_DIR, 'test-global-cost-tracking.jsonl')

beforeEach(() => {
  if (fs.existsSync(TEST_LOG_PATH)) {
    fs.unlinkSync(TEST_LOG_PATH)
  }
  if (fs.existsSync(TEST_GLOBAL_LOG_PATH)) {
    fs.unlinkSync(TEST_GLOBAL_LOG_PATH)
  }
})

afterAll(() => {
  if (fs.existsSync(TEST_LOG_DIR)) {
    fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true })
  }
})

describe('CostTracker', () => {
  function createTracker(budget?: Partial<BudgetConfig>): CostTracker {
    const defaultBudget: BudgetConfig = {
      monthlyLimit: 50,
      dailyLimit: 5,
      warningThresholdPercent: 80,
      hardLimitAction: 'fallback-to-free',
      globalMonthlyLimit: 200,
      globalDailyLimit: 15,
      opusDailyLimit: 2,
      opusMonthlyLimit: 30,
      ...budget,
    }
    return new CostTracker({
      logPath: TEST_LOG_PATH,
      globalLogPath: TEST_GLOBAL_LOG_PATH,
      budget: defaultBudget,
      projectId: 'test-project',
    })
  }

  describe('calculateCost', () => {
    it('should calculate cost for Claude Opus correctly', () => {
      const tracker = createTracker()
      const cost = tracker.calculateCost('claude-opus', 1_000_000, 1_000_000)
      expect(cost).toBe(30)
    })

    it('should calculate cost for Claude Sonnet correctly', () => {
      const tracker = createTracker()
      const cost = tracker.calculateCost('claude-sonnet', 1_000_000, 1_000_000)
      expect(cost).toBe(18)
    })

    it('should calculate cost for Claude Haiku correctly', () => {
      const tracker = createTracker()
      const cost = tracker.calculateCost('claude-haiku', 1_000_000, 1_000_000)
      expect(cost).toBe(6)
    })

    it('should return zero cost for Ollama models', () => {
      const tracker = createTracker()
      const cost = tracker.calculateCost('ollama-qwen3-coder', 1_000_000, 1_000_000)
      expect(cost).toBe(0)
    })

    it('should apply cached token discount', () => {
      const tracker = createTracker()
      const costWithoutCache = tracker.calculateCost('claude-opus', 1_000_000, 1_000_000, 0)
      const costWithCache = tracker.calculateCost('claude-opus', 1_000_000, 1_000_000, 500_000)
      expect(costWithCache).toBeLessThan(costWithoutCache)
    })

    it('should handle zero tokens', () => {
      const tracker = createTracker()
      const cost = tracker.calculateCost('claude-opus', 0, 0)
      expect(cost).toBe(0)
    })
  })

  describe('recordUsage', () => {
    it('should create a cost record with correct fields', () => {
      const tracker = createTracker()
      const record = tracker.recordUsage(
        'claude-sonnet',
        'anthropic-api',
        10_000,
        5_000,
        0,
        'coding'
      )

      expect(record.model).toBe('claude-sonnet')
      expect(record.provider).toBe('anthropic-api')
      expect(record.inputTokens).toBe(10_000)
      expect(record.outputTokens).toBe(5_000)
      expect(record.cachedTokens).toBe(0)
      expect(record.cost).toBeGreaterThan(0)
      expect(record.taskType).toBe('coding')
      expect(record.timestamp).toBeDefined()
    })

    it('should persist record to JSONL file', () => {
      const tracker = createTracker()
      tracker.recordUsage('claude-haiku', 'anthropic-api', 1000, 500)

      expect(fs.existsSync(TEST_LOG_PATH)).toBe(true)
      const content = fs.readFileSync(TEST_LOG_PATH, 'utf-8').trim()
      const parsed = JSON.parse(content)
      expect(parsed.model).toBe('claude-haiku')
    })

    it('should append multiple records', () => {
      const tracker = createTracker()
      tracker.recordUsage('claude-haiku', 'anthropic-api', 1000, 500)
      tracker.recordUsage('claude-sonnet', 'anthropic-api', 2000, 1000)

      const lines = fs.readFileSync(TEST_LOG_PATH, 'utf-8').trim().split('\n')
      expect(lines).toHaveLength(2)
    })
  })

  describe('getDailySpend', () => {
    it('should sum costs for today', () => {
      const tracker = createTracker()
      tracker.recordUsage('claude-sonnet', 'anthropic-api', 100_000, 50_000)
      tracker.recordUsage('claude-haiku', 'anthropic-api', 50_000, 25_000)

      const daily = tracker.getDailySpend()
      expect(daily).toBeGreaterThan(0)
    })

    it('should return zero with no records', () => {
      const tracker = createTracker()
      const daily = tracker.getDailySpend()
      expect(daily).toBe(0)
    })
  })

  describe('getMonthlySpend', () => {
    it('should sum costs for current month', () => {
      const tracker = createTracker()
      tracker.recordUsage('claude-opus', 'anthropic-max', 500_000, 200_000)

      const monthly = tracker.getMonthlySpend()
      expect(monthly).toBeGreaterThan(0)
    })
  })

  describe('checkBudget', () => {
    it('should report not over budget with low spend', () => {
      const tracker = createTracker()
      tracker.recordUsage('claude-haiku', 'anthropic-api', 1000, 500)

      const status = tracker.checkBudget()
      expect(status.isOverBudget).toBe(false)
      expect(status.dailyRemaining).toBeGreaterThan(0)
      expect(status.monthlyRemaining).toBeGreaterThan(0)
    })

    it('should report over budget when daily limit exceeded', () => {
      const tracker = createTracker({ dailyLimit: 0.001 })
      tracker.recordUsage('claude-opus', 'anthropic-max', 100_000, 50_000)

      const status = tracker.checkBudget()
      expect(status.isOverBudget).toBe(true)
    })

    it('should calculate percent used correctly', () => {
      const tracker = createTracker({ monthlyLimit: 100 })
      const status = tracker.checkBudget()
      expect(status.percentUsed).toBe(0)
    })
  })

  describe('isWarningThreshold', () => {
    it('should return false when under threshold', () => {
      const tracker = createTracker()
      expect(tracker.isWarningThreshold()).toBe(false)
    })
  })

  describe('getCostReport', () => {
    it('should generate a daily report', () => {
      const tracker = createTracker()
      tracker.recordUsage('claude-sonnet', 'anthropic-api', 10_000, 5_000, 0, 'coding')
      tracker.recordUsage('ollama-qwen3-coder', 'ollama', 20_000, 10_000, 0, 'background')

      const report = tracker.getCostReport('day')
      expect(report.period).toBe('day')
      expect(report.requestCount).toBe(2)
      expect(report.totalCost).toBeGreaterThanOrEqual(0)
      expect(report.byModel).toBeDefined()
      expect(report.byProvider).toBeDefined()
      expect(report.budgetStatus).toBeDefined()
    })

    it('should generate a weekly report', () => {
      const tracker = createTracker()
      const report = tracker.getCostReport('week')
      expect(report.period).toBe('week')
    })

    it('should generate a monthly report', () => {
      const tracker = createTracker()
      const report = tracker.getCostReport('month')
      expect(report.period).toBe('month')
    })

    it('should handle zero requests', () => {
      const tracker = createTracker()
      const report = tracker.getCostReport('day')
      expect(report.requestCount).toBe(0)
      expect(report.totalCost).toBe(0)
      expect(report.averageCostPerRequest).toBe(0)
    })
  })

  describe('global budget tracking', () => {
    it('should dual-write records to global log', () => {
      const tracker = createTracker()
      tracker.recordUsage('claude-sonnet', 'anthropic-api', 10_000, 5_000)

      expect(fs.existsSync(TEST_GLOBAL_LOG_PATH)).toBe(true)
      const globalContent = fs.readFileSync(TEST_GLOBAL_LOG_PATH, 'utf-8').trim()
      const parsed = JSON.parse(globalContent)
      expect(parsed.projectId).toBe('test-project')
    })

    it('should include projectId in records', () => {
      const tracker = createTracker()
      const record = tracker.recordUsage('claude-haiku', 'anthropic-api', 1000, 500)
      expect(record.projectId).toBe('test-project')
    })

    it('should calculate global daily spend', () => {
      const tracker = createTracker()
      tracker.recordUsage('claude-sonnet', 'anthropic-api', 100_000, 50_000)
      const globalDaily = tracker.getGlobalDailySpend()
      expect(globalDaily).toBeGreaterThan(0)
    })

    it('should calculate global monthly spend', () => {
      const tracker = createTracker()
      tracker.recordUsage('claude-opus', 'anthropic-max', 100_000, 50_000)
      const globalMonthly = tracker.getGlobalMonthlySpend()
      expect(globalMonthly).toBeGreaterThan(0)
    })

    it('should track Opus daily spend separately', () => {
      const tracker = createTracker()
      tracker.recordUsage('claude-opus', 'anthropic-max', 100_000, 50_000)
      tracker.recordUsage('claude-sonnet', 'anthropic-api', 100_000, 50_000)
      const opusDaily = tracker.getOpusDailySpend()
      const totalDaily = tracker.getGlobalDailySpend()
      expect(opusDaily).toBeGreaterThan(0)
      expect(opusDaily).toBeLessThan(totalDaily)
    })

    it('should detect global over budget', () => {
      const tracker = createTracker({ globalDailyLimit: 0.001 })
      tracker.recordUsage('claude-opus', 'anthropic-max', 100_000, 50_000)
      const status = tracker.checkBudget()
      expect(status.isGlobalOverBudget).toBe(true)
      expect(status.isOverBudget).toBe(true)
    })

    it('should detect Opus daily limit exceeded', () => {
      const tracker = createTracker({ opusDailyLimit: 0.001 })
      tracker.recordUsage('claude-opus', 'anthropic-max', 100_000, 50_000)
      const status = tracker.checkBudget()
      expect(status.isOpusOverLimit).toBe(true)
    })

    it('should include global fields in budget status', () => {
      const tracker = createTracker()
      const status = tracker.checkBudget()
      expect(status.globalDailySpend).toBeDefined()
      expect(status.globalMonthlySpend).toBeDefined()
      expect(status.isGlobalOverBudget).toBeDefined()
      expect(status.opusDailySpend).toBeDefined()
      expect(status.isOpusOverLimit).toBeDefined()
    })
  })

  describe('GPT-5.3-Codex cost calculation', () => {
    it('should calculate cost for GPT-5.3-Codex correctly', () => {
      const tracker = createTracker()
      const cost = tracker.calculateCost('gpt53-codex', 1_000_000, 1_000_000)
      expect(cost).toBe(11.25)
    })
  })

  describe('fromConfig', () => {
    it('should create tracker from routing config', () => {
      const config = {
        providers: [],
        models: {
          'claude-opus': {
            id: 'claude-opus-4-6',
            provider: 'anthropic-max' as const,
            displayName: 'Opus',
            cost: { inputPerMillion: 5, outputPerMillion: 25 },
            maxTokens: 200000,
          },
        } as any,
        routingRules: [],
        budget: {
          monthlyLimit: 100,
          dailyLimit: 10,
          warningThresholdPercent: 80,
          hardLimitAction: 'fallback-to-free' as const,
        },
        fallbackChain: [],
      }

      const tracker = CostTracker.fromConfig(config, TEST_LOG_PATH)
      expect(tracker).toBeInstanceOf(CostTracker)
    })
  })
})
