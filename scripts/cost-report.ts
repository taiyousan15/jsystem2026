import { CostTracker } from '../src/performance/CostTracker'
import type { CostReport } from '../src/performance/types'

type Period = 'day' | 'week' | 'month'

function parseArgs(): { period: Period; showModels: boolean } {
  const args = process.argv.slice(2)
  let period: Period = 'day'
  let showModels = false

  for (const arg of args) {
    if (arg.startsWith('--period=')) {
      const value = arg.split('=')[1]
      if (value === 'day' || value === 'week' || value === 'month') {
        period = value
      }
    }
    if (arg === '--model' || arg === '--models') {
      showModels = true
    }
  }

  return { period, showModels }
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(4)}`
}

function formatReport(report: CostReport, showModels: boolean): string {
  const lines: string[] = []
  const divider = '─'.repeat(50)

  lines.push('')
  lines.push(`  LLM Cost Report (${report.period})`)
  lines.push(`  ${divider}`)
  lines.push('')
  lines.push(`  Total Cost:       ${formatCurrency(report.totalCost)}`)
  lines.push(`  Requests:         ${report.requestCount}`)
  lines.push(`  Avg Cost/Request: ${formatCurrency(report.averageCostPerRequest)}`)
  lines.push('')

  if (showModels && Object.keys(report.byModel).length > 0) {
    lines.push('  Cost by Model:')
    const sortedModels = Object.entries(report.byModel)
      .sort(([, a], [, b]) => b - a)
    for (const [model, cost] of sortedModels) {
      const pct = report.totalCost > 0 ? ((cost / report.totalCost) * 100).toFixed(1) : '0.0'
      lines.push(`    ${model.padEnd(25)} ${formatCurrency(cost).padStart(10)}  (${pct}%)`)
    }
    lines.push('')
  }

  if (showModels && Object.keys(report.byProvider).length > 0) {
    lines.push('  Cost by Provider:')
    const sortedProviders = Object.entries(report.byProvider)
      .sort(([, a], [, b]) => b - a)
    for (const [provider, cost] of sortedProviders) {
      const pct = report.totalCost > 0 ? ((cost / report.totalCost) * 100).toFixed(1) : '0.0'
      lines.push(`    ${provider.padEnd(25)} ${formatCurrency(cost).padStart(10)}  (${pct}%)`)
    }
    lines.push('')
  }

  const budget = report.budgetStatus
  lines.push(`  ${divider}`)
  lines.push('  Budget Status:')
  lines.push(`    Daily:    ${formatCurrency(budget.dailySpend)} / ${formatCurrency(budget.dailyRemaining + budget.dailySpend)} remaining`)
  lines.push(`    Monthly:  ${formatCurrency(budget.monthlySpend)} / ${formatCurrency(budget.monthlyRemaining + budget.monthlySpend)} remaining`)
  lines.push(`    Usage:    ${budget.percentUsed.toFixed(1)}%`)

  if (budget.isOverBudget) {
    lines.push('')
    lines.push('  *** BUDGET EXCEEDED - Routing to free models ***')
  } else if (budget.percentUsed >= 80) {
    lines.push('')
    lines.push('  *** WARNING: Approaching budget limit ***')
  }

  lines.push('')
  return lines.join('\n')
}

function main(): void {
  const { period, showModels } = parseArgs()
  const tracker = new CostTracker()
  const report = tracker.getCostReport(period)
  const output = formatReport(report, showModels)
  process.stdout.write(output)
}

main()
