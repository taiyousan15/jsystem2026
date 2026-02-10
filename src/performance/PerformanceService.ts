import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import type {
  ModelType,
  TaskComplexity,
  ModelSelectionCriteria,
  ModelRoutingConfig,
  ModelRoutingResult,
  CostReport,
  BudgetStatus,
} from './types'
import { CostTracker } from './CostTracker'
import { ModelRouter } from './ModelRouter'

const CONFIG_PATH = path.join(process.cwd(), '.claude', 'performance.yaml')

export class PerformanceService {
  private config: ModelRoutingConfig | null = null
  private costTracker: CostTracker | null = null
  private modelRouter: ModelRouter | null = null

  getConfig(): ModelRoutingConfig | null {
    if (!this.config) {
      this.config = this.loadConfig()
    }
    return this.config
  }

  getCostTracker(): CostTracker {
    if (!this.costTracker) {
      const config = this.getConfig()
      this.costTracker = config
        ? CostTracker.fromConfig(config)
        : new CostTracker()
    }
    return this.costTracker
  }

  getModelRouter(): ModelRouter {
    if (!this.modelRouter) {
      const config = this.getConfig()
      this.modelRouter = new ModelRouter({
        costTracker: this.getCostTracker(),
        config: config ?? undefined,
      })
    }
    return this.modelRouter
  }

  async routeModel(criteria: ModelSelectionCriteria): Promise<ModelRoutingResult> {
    return this.getModelRouter().route(criteria)
  }

  recommendModel(complexity: TaskComplexity): ModelType {
    const complexityMap: Record<TaskComplexity, ModelType> = {
      trivial: 'ollama-qwen3-coder',
      simple: 'claude-haiku',
      moderate: 'claude-sonnet',
      complex: 'claude-sonnet',
      expert: 'claude-opus',
    }
    return complexityMap[complexity]
  }

  estimateCost(model: ModelType, inputTokens: number, outputTokens: number): number {
    return this.getCostTracker().calculateCost(model, inputTokens, outputTokens)
  }

  checkBudget(): BudgetStatus {
    return this.getCostTracker().checkBudget()
  }

  getCostReport(period: 'day' | 'week' | 'month'): CostReport {
    return this.getCostTracker().getCostReport(period)
  }

  private loadConfig(): ModelRoutingConfig | null {
    try {
      if (!fs.existsSync(CONFIG_PATH)) {
        return null
      }
      const content = fs.readFileSync(CONFIG_PATH, 'utf-8')
      return yaml.load(content) as ModelRoutingConfig
    } catch (error) {
      console.error('Failed to load performance config:', (error as Error).message)
      return null
    }
  }
}
