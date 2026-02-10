import * as fs from 'fs'
import * as path from 'path'
import { PerformanceService } from '../../src/performance/PerformanceService'
import { CostTracker } from '../../src/performance/CostTracker'
import { ModelRouter } from '../../src/performance/ModelRouter'
import type { ModelSelectionCriteria, TaskComplexity } from '../../src/performance/types'

const TEST_LOG_DIR = path.join(__dirname, '..', '.tmp')
const TEST_LOG_PATH = path.join(TEST_LOG_DIR, 'integration-cost.jsonl')

beforeEach(() => {
  if (fs.existsSync(TEST_LOG_PATH)) {
    fs.unlinkSync(TEST_LOG_PATH)
  }
})

afterAll(() => {
  if (fs.existsSync(TEST_LOG_DIR)) {
    fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true })
  }
})

describe('Model Routing Integration', () => {
  describe('CostTracker + ModelRouter integration', () => {
    it('should route to free model when budget is exceeded', async () => {
      const costTracker = new CostTracker({
        logPath: TEST_LOG_PATH,
        budget: {
          monthlyLimit: 0.001,
          dailyLimit: 0.001,
          warningThresholdPercent: 80,
          hardLimitAction: 'fallback-to-free',
        },
      })

      costTracker.recordUsage('claude-opus', 'anthropic-max', 100_000, 50_000)

      const router = new ModelRouter({ costTracker })
      const result = await router.route({ taskComplexity: 'expert' })

      expect(result.model).toBe('ollama-qwen3-coder')
      expect(result.reason).toContain('Budget exceeded')
    })

    it('should track cost after routing decision', async () => {
      const costTracker = new CostTracker({ logPath: TEST_LOG_PATH })
      const router = new ModelRouter({ costTracker })

      const result = await router.route({ taskComplexity: 'simple' })

      costTracker.recordUsage(
        result.model,
        result.provider,
        5000,
        2000
      )

      const report = costTracker.getCostReport('day')
      expect(report.requestCount).toBe(1)
    })
  })

  describe('PerformanceService integration', () => {
    it('should recommend models by complexity', () => {
      const service = new PerformanceService()

      const complexities: TaskComplexity[] = ['trivial', 'simple', 'moderate', 'complex', 'expert']
      for (const complexity of complexities) {
        const model = service.recommendModel(complexity)
        expect(model).toBeDefined()
      }
    })

    it('should estimate cost correctly', () => {
      const service = new PerformanceService()

      const opusCost = service.estimateCost('claude-opus', 1_000_000, 1_000_000)
      const haikuCost = service.estimateCost('claude-haiku', 1_000_000, 1_000_000)

      expect(opusCost).toBeGreaterThan(haikuCost)
    })

    it('should provide budget status', () => {
      const service = new PerformanceService()
      const status = service.checkBudget()

      expect(status).toHaveProperty('isOverBudget')
      expect(status).toHaveProperty('dailySpend')
      expect(status).toHaveProperty('monthlySpend')
      expect(status).toHaveProperty('percentUsed')
    })

    it('should generate cost report', () => {
      const service = new PerformanceService()
      const report = service.getCostReport('day')

      expect(report).toHaveProperty('period', 'day')
      expect(report).toHaveProperty('totalCost')
      expect(report).toHaveProperty('requestCount')
      expect(report).toHaveProperty('budgetStatus')
    })
  })

  describe('Full routing pipeline', () => {
    it('should handle multiple requests with budget tracking', async () => {
      const costTracker = new CostTracker({
        logPath: TEST_LOG_PATH,
        budget: {
          monthlyLimit: 50,
          dailyLimit: 5,
          warningThresholdPercent: 80,
          hardLimitAction: 'fallback-to-free',
        },
      })
      const router = new ModelRouter({ costTracker })

      const tasks: ModelSelectionCriteria[] = [
        { taskComplexity: 'trivial' },
        { taskComplexity: 'simple' },
        { taskComplexity: 'moderate' },
        { taskComplexity: 'complex' },
        { taskComplexity: 'expert' },
      ]

      for (const task of tasks) {
        const result = await router.route(task)
        costTracker.recordUsage(result.model, result.provider, 5000, 2000)
      }

      const report = costTracker.getCostReport('day')
      expect(report.requestCount).toBe(5)
      expect(report.totalCost).toBeGreaterThanOrEqual(0)
    })

    it('should transition to free models as budget depletes', async () => {
      const costTracker = new CostTracker({
        logPath: TEST_LOG_PATH,
        budget: {
          monthlyLimit: 0.01,
          dailyLimit: 0.001,
          warningThresholdPercent: 50,
          hardLimitAction: 'fallback-to-free',
        },
      })
      const router = new ModelRouter({ costTracker })

      // First request: normal routing
      const first = await router.route({ taskComplexity: 'moderate' })

      // Simulate spending that exceeds budget
      costTracker.recordUsage('claude-sonnet', 'anthropic-api', 1_000_000, 500_000)

      // Second request: should be routed to free model
      const second = await router.route({ taskComplexity: 'moderate' })
      expect(second.model).toBe('ollama-qwen3-coder')
    })
  })

  describe('Fallback chain', () => {
    it('should follow the fallback chain order', () => {
      const router = new ModelRouter()

      let current: string | null = 'claude-opus'
      const chain: string[] = [current]

      while (current) {
        current = router.getFallbackModel(current as any)
        if (current) {
          chain.push(current)
        }
      }

      expect(chain).toEqual([
        'claude-opus',
        'claude-sonnet',
        'gpt53-codex',
        'claude-haiku',
        'ollama-qwen3-coder',
        'openrouter-free',
      ])
    })
  })
})
