import { prisma } from '../../utils/prisma'
import { analyzeKeywords } from './keywordAnalyzer'
import { analyzeSentimentBatch } from './sentimentAnalyzer'
import * as fs from 'fs'
import * as path from 'path'

interface ReportData {
  generatedAt: string
  period: string
  accounts: AccountReport[]
  summary: ReportSummary
}

interface AccountReport {
  accountId: string
  accountName: string
  platform: string
  followerMetrics: {
    current: number
    change: number
    changePercent: number
    history: { date: string; count: number }[]
  }
  engagementMetrics: {
    averageRate: number
    totalLikes: number
    totalComments: number
    totalShares: number
  }
  sentiment: {
    distribution: { positive: number; negative: number; neutral: number; mixed: number }
    averageScore: number
    trend: string
  }
  topKeywords: { keyword: string; count: number }[]
  topHashtags: { keyword: string; count: number }[]
}

interface ReportSummary {
  totalAccounts: number
  totalFollowers: number
  averageEngagement: number
  overallSentiment: string
}

async function gatherReportData(
  accountIds: string[],
  days: number
): Promise<ReportData> {
  const accounts: AccountReport[] = []
  let totalFollowers = 0
  let totalEngagement = 0
  let sentimentSum = 0

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  for (const accountId of accountIds) {
    const account = await prisma.snsAccount.findUnique({
      where: { id: accountId },
      include: {
        followerMetrics: {
          where: { recordedDate: { gte: startDate } },
          orderBy: { recordedDate: 'asc' },
        },
        posts: {
          where: { postedAt: { gte: startDate } },
        },
      },
    })

    if (!account) continue

    // Follower metrics
    const followerHistory = account.followerMetrics.map((m) => ({
      date: m.recordedDate.toISOString().split('T')[0],
      count: m.followerCount,
    }))

    const currentFollowers =
      followerHistory.length > 0
        ? followerHistory[followerHistory.length - 1].count
        : 0
    const startFollowers =
      followerHistory.length > 0 ? followerHistory[0].count : currentFollowers
    const followerChange = currentFollowers - startFollowers
    const changePercent =
      startFollowers > 0
        ? ((followerChange / startFollowers) * 100)
        : 0

    totalFollowers += currentFollowers

    // Engagement metrics
    let totalLikes = 0
    let totalComments = 0
    let totalShares = 0

    for (const post of account.posts) {
      const engagement = post.engagement as {
        likes?: number
        comments?: number
        shares?: number
      } | null

      totalLikes += engagement?.likes || 0
      totalComments += engagement?.comments || 0
      totalShares += engagement?.shares || 0
    }

    const totalEngagementCount = totalLikes + totalComments + totalShares
    const averageRate =
      currentFollowers > 0 && account.posts.length > 0
        ? (totalEngagementCount / account.posts.length / currentFollowers) * 100
        : 0

    totalEngagement += averageRate

    // Keyword analysis
    const keywordAnalysis = await analyzeKeywords(accountId, days)

    // Sentiment analysis
    const sentimentAnalysis = await analyzeSentimentBatch(accountId, days)
    sentimentSum += sentimentAnalysis.averageScore

    accounts.push({
      accountId,
      accountName: account.displayName || account.accountId,
      platform: account.platform,
      followerMetrics: {
        current: currentFollowers,
        change: followerChange,
        changePercent: parseFloat(changePercent.toFixed(2)),
        history: followerHistory,
      },
      engagementMetrics: {
        averageRate: parseFloat(averageRate.toFixed(2)),
        totalLikes,
        totalComments,
        totalShares,
      },
      sentiment: {
        distribution: sentimentAnalysis.distribution,
        averageScore: parseFloat(sentimentAnalysis.averageScore.toFixed(2)),
        trend: sentimentAnalysis.trend,
      },
      topKeywords: keywordAnalysis.keywords.slice(0, 10).map((k) => ({
        keyword: k.keyword,
        count: k.count,
      })),
      topHashtags: keywordAnalysis.hashtags.slice(0, 10).map((h) => ({
        keyword: h.keyword,
        count: h.count,
      })),
    })
  }

  const avgEngagement =
    accounts.length > 0 ? totalEngagement / accounts.length : 0
  const avgSentiment = accounts.length > 0 ? sentimentSum / accounts.length : 0

  let overallSentiment: string
  if (avgSentiment > 0.3) {
    overallSentiment = 'ポジティブ'
  } else if (avgSentiment < -0.3) {
    overallSentiment = 'ネガティブ'
  } else {
    overallSentiment = 'ニュートラル'
  }

  return {
    generatedAt: new Date().toISOString(),
    period: `${days}日間`,
    accounts,
    summary: {
      totalAccounts: accounts.length,
      totalFollowers,
      averageEngagement: parseFloat(avgEngagement.toFixed(2)),
      overallSentiment,
    },
  }
}

function generateCSVContent(data: ReportData): string {
  const lines: string[] = []

  // Header
  lines.push('SNS Research Tool - 分析レポート')
  lines.push(`生成日時: ${new Date(data.generatedAt).toLocaleString('ja-JP')}`)
  lines.push(`対象期間: ${data.period}`)
  lines.push('')

  // Summary
  lines.push('=== サマリー ===')
  lines.push(`総アカウント数: ${data.summary.totalAccounts}`)
  lines.push(`総フォロワー数: ${data.summary.totalFollowers.toLocaleString()}`)
  lines.push(`平均エンゲージメント率: ${data.summary.averageEngagement}%`)
  lines.push(`全体的なセンチメント: ${data.summary.overallSentiment}`)
  lines.push('')

  // Per-account data
  for (const account of data.accounts) {
    lines.push(`=== ${account.accountName} (${account.platform}) ===`)
    lines.push('')

    // Follower metrics
    lines.push('--- フォロワー推移 ---')
    lines.push(`現在のフォロワー数: ${account.followerMetrics.current.toLocaleString()}`)
    lines.push(`変化: ${account.followerMetrics.change > 0 ? '+' : ''}${account.followerMetrics.change.toLocaleString()} (${account.followerMetrics.changePercent}%)`)
    lines.push('')

    // Engagement metrics
    lines.push('--- エンゲージメント ---')
    lines.push(`平均エンゲージメント率: ${account.engagementMetrics.averageRate}%`)
    lines.push(`総いいね数: ${account.engagementMetrics.totalLikes.toLocaleString()}`)
    lines.push(`総コメント数: ${account.engagementMetrics.totalComments.toLocaleString()}`)
    lines.push(`総シェア数: ${account.engagementMetrics.totalShares.toLocaleString()}`)
    lines.push('')

    // Sentiment
    lines.push('--- センチメント分析 ---')
    lines.push(`平均スコア: ${account.sentiment.averageScore}`)
    lines.push(`トレンド: ${account.sentiment.trend}`)
    lines.push(`ポジティブ: ${account.sentiment.distribution.positive}件`)
    lines.push(`ネガティブ: ${account.sentiment.distribution.negative}件`)
    lines.push(`ニュートラル: ${account.sentiment.distribution.neutral}件`)
    lines.push('')

    // Keywords
    if (account.topKeywords.length > 0) {
      lines.push('--- トップキーワード ---')
      for (const kw of account.topKeywords) {
        lines.push(`${kw.keyword}: ${kw.count}回`)
      }
      lines.push('')
    }

    // Hashtags
    if (account.topHashtags.length > 0) {
      lines.push('--- トップハッシュタグ ---')
      for (const ht of account.topHashtags) {
        lines.push(`${ht.keyword}: ${ht.count}回`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

function generateExcelXML(data: ReportData): string {
  // Generate simple XML spreadsheet format
  const rows: string[] = []

  // Summary sheet
  rows.push('<?xml version="1.0"?>')
  rows.push('<?mso-application progid="Excel.Sheet"?>')
  rows.push('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"')
  rows.push(' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">')

  // Summary worksheet
  rows.push('<Worksheet ss:Name="サマリー">')
  rows.push('<Table>')

  rows.push('<Row><Cell><Data ss:Type="String">SNS Research Tool - 分析レポート</Data></Cell></Row>')
  rows.push(`<Row><Cell><Data ss:Type="String">生成日時: ${new Date(data.generatedAt).toLocaleString('ja-JP')}</Data></Cell></Row>`)
  rows.push(`<Row><Cell><Data ss:Type="String">対象期間: ${data.period}</Data></Cell></Row>`)
  rows.push('<Row></Row>')
  rows.push('<Row><Cell><Data ss:Type="String">項目</Data></Cell><Cell><Data ss:Type="String">値</Data></Cell></Row>')
  rows.push(`<Row><Cell><Data ss:Type="String">総アカウント数</Data></Cell><Cell><Data ss:Type="Number">${data.summary.totalAccounts}</Data></Cell></Row>`)
  rows.push(`<Row><Cell><Data ss:Type="String">総フォロワー数</Data></Cell><Cell><Data ss:Type="Number">${data.summary.totalFollowers}</Data></Cell></Row>`)
  rows.push(`<Row><Cell><Data ss:Type="String">平均エンゲージメント率</Data></Cell><Cell><Data ss:Type="Number">${data.summary.averageEngagement}</Data></Cell></Row>`)
  rows.push(`<Row><Cell><Data ss:Type="String">全体的なセンチメント</Data></Cell><Cell><Data ss:Type="String">${data.summary.overallSentiment}</Data></Cell></Row>`)

  rows.push('</Table>')
  rows.push('</Worksheet>')

  // Account details worksheet
  rows.push('<Worksheet ss:Name="アカウント詳細">')
  rows.push('<Table>')

  // Header row
  rows.push('<Row>')
  rows.push('<Cell><Data ss:Type="String">アカウント</Data></Cell>')
  rows.push('<Cell><Data ss:Type="String">プラットフォーム</Data></Cell>')
  rows.push('<Cell><Data ss:Type="String">フォロワー数</Data></Cell>')
  rows.push('<Cell><Data ss:Type="String">フォロワー変化</Data></Cell>')
  rows.push('<Cell><Data ss:Type="String">変化率(%)</Data></Cell>')
  rows.push('<Cell><Data ss:Type="String">エンゲージメント率(%)</Data></Cell>')
  rows.push('<Cell><Data ss:Type="String">いいね</Data></Cell>')
  rows.push('<Cell><Data ss:Type="String">コメント</Data></Cell>')
  rows.push('<Cell><Data ss:Type="String">センチメントスコア</Data></Cell>')
  rows.push('<Cell><Data ss:Type="String">センチメントトレンド</Data></Cell>')
  rows.push('</Row>')

  // Data rows
  for (const account of data.accounts) {
    rows.push('<Row>')
    rows.push(`<Cell><Data ss:Type="String">${escapeXML(account.accountName)}</Data></Cell>`)
    rows.push(`<Cell><Data ss:Type="String">${account.platform}</Data></Cell>`)
    rows.push(`<Cell><Data ss:Type="Number">${account.followerMetrics.current}</Data></Cell>`)
    rows.push(`<Cell><Data ss:Type="Number">${account.followerMetrics.change}</Data></Cell>`)
    rows.push(`<Cell><Data ss:Type="Number">${account.followerMetrics.changePercent}</Data></Cell>`)
    rows.push(`<Cell><Data ss:Type="Number">${account.engagementMetrics.averageRate}</Data></Cell>`)
    rows.push(`<Cell><Data ss:Type="Number">${account.engagementMetrics.totalLikes}</Data></Cell>`)
    rows.push(`<Cell><Data ss:Type="Number">${account.engagementMetrics.totalComments}</Data></Cell>`)
    rows.push(`<Cell><Data ss:Type="Number">${account.sentiment.averageScore}</Data></Cell>`)
    rows.push(`<Cell><Data ss:Type="String">${account.sentiment.trend}</Data></Cell>`)
    rows.push('</Row>')
  }

  rows.push('</Table>')
  rows.push('</Worksheet>')

  rows.push('</Workbook>')

  return rows.join('\n')
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateHTMLReport(data: ReportData): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>SNS Research Tool - 分析レポート</title>
  <style>
    body { font-family: 'Hiragino Sans', 'Meiryo', sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    h3 { color: #6b7280; }
    .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .summary-card { background: white; padding: 15px; border-radius: 8px; text-align: center; }
    .summary-card .value { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .summary-card .label { color: #6b7280; font-size: 14px; }
    .account-section { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0; }
    .metric { background: #f9fafb; padding: 12px; border-radius: 6px; }
    .metric .label { font-size: 12px; color: #6b7280; }
    .metric .value { font-size: 18px; font-weight: 600; }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    .neutral { color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .tag { display: inline-block; padding: 2px 8px; background: #e0e7ff; color: #4f46e5; border-radius: 4px; margin: 2px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>SNS Research Tool - 分析レポート</h1>
  <p>生成日時: ${new Date(data.generatedAt).toLocaleString('ja-JP')} | 対象期間: ${data.period}</p>

  <div class="summary">
    <h2>サマリー</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="value">${data.summary.totalAccounts}</div>
        <div class="label">総アカウント数</div>
      </div>
      <div class="summary-card">
        <div class="value">${data.summary.totalFollowers.toLocaleString()}</div>
        <div class="label">総フォロワー数</div>
      </div>
      <div class="summary-card">
        <div class="value">${data.summary.averageEngagement}%</div>
        <div class="label">平均エンゲージメント率</div>
      </div>
      <div class="summary-card">
        <div class="value ${data.summary.overallSentiment === 'ポジティブ' ? 'positive' : data.summary.overallSentiment === 'ネガティブ' ? 'negative' : 'neutral'}">${data.summary.overallSentiment}</div>
        <div class="label">全体的なセンチメント</div>
      </div>
    </div>
  </div>

  ${data.accounts
    .map(
      (account) => `
  <div class="account-section">
    <h2>${escapeHTML(account.accountName)} <span style="color: #6b7280; font-size: 14px;">(${account.platform})</span></h2>

    <div class="metrics-grid">
      <div class="metric">
        <div class="label">現在のフォロワー数</div>
        <div class="value">${account.followerMetrics.current.toLocaleString()}</div>
      </div>
      <div class="metric">
        <div class="label">フォロワー変化</div>
        <div class="value ${account.followerMetrics.change >= 0 ? 'positive' : 'negative'}">
          ${account.followerMetrics.change >= 0 ? '+' : ''}${account.followerMetrics.change.toLocaleString()} (${account.followerMetrics.changePercent}%)
        </div>
      </div>
      <div class="metric">
        <div class="label">エンゲージメント率</div>
        <div class="value">${account.engagementMetrics.averageRate}%</div>
      </div>
    </div>

    <h3>エンゲージメント詳細</h3>
    <div class="metrics-grid">
      <div class="metric">
        <div class="label">いいね</div>
        <div class="value">${account.engagementMetrics.totalLikes.toLocaleString()}</div>
      </div>
      <div class="metric">
        <div class="label">コメント</div>
        <div class="value">${account.engagementMetrics.totalComments.toLocaleString()}</div>
      </div>
      <div class="metric">
        <div class="label">シェア</div>
        <div class="value">${account.engagementMetrics.totalShares.toLocaleString()}</div>
      </div>
    </div>

    <h3>センチメント分析</h3>
    <div class="metrics-grid">
      <div class="metric">
        <div class="label">平均スコア</div>
        <div class="value ${account.sentiment.averageScore > 0 ? 'positive' : account.sentiment.averageScore < 0 ? 'negative' : 'neutral'}">${account.sentiment.averageScore}</div>
      </div>
      <div class="metric">
        <div class="label">トレンド</div>
        <div class="value">${account.sentiment.trend}</div>
      </div>
      <div class="metric">
        <div class="label">分布</div>
        <div class="value" style="font-size: 12px;">
          <span class="positive">+${account.sentiment.distribution.positive}</span> /
          <span class="negative">-${account.sentiment.distribution.negative}</span> /
          <span class="neutral">${account.sentiment.distribution.neutral}</span>
        </div>
      </div>
    </div>

    ${
      account.topKeywords.length > 0
        ? `
    <h3>トップキーワード</h3>
    <div>${account.topKeywords.map((k) => `<span class="tag">${escapeHTML(k.keyword)} (${k.count})</span>`).join('')}</div>
    `
        : ''
    }

    ${
      account.topHashtags.length > 0
        ? `
    <h3>トップハッシュタグ</h3>
    <div>${account.topHashtags.map((h) => `<span class="tag">${escapeHTML(h.keyword)} (${h.count})</span>`).join('')}</div>
    `
        : ''
    }
  </div>
  `
    )
    .join('')}

  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; text-align: center;">
    <p>Generated by SNS Research Tool</p>
  </footer>
</body>
</html>`
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function generateReport(
  reportId: string,
  accountIds: string[],
  format: 'PDF' | 'EXCEL',
  days: number
): Promise<string> {
  // Update status to processing
  await prisma.report.update({
    where: { id: reportId },
    data: { status: 'PROCESSING' },
  })

  try {
    // Gather all data
    const data = await gatherReportData(accountIds, days)

    // Create reports directory if it doesn't exist
    const reportsDir = path.join(process.cwd(), 'reports')
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }

    let filePath: string
    let fileUrl: string

    if (format === 'PDF') {
      // For PDF, we generate HTML and note that it can be converted to PDF
      // In production, you would use puppeteer or similar to convert HTML to PDF
      const htmlContent = generateHTMLReport(data)
      filePath = path.join(reportsDir, `${reportId}.html`)
      fs.writeFileSync(filePath, htmlContent, 'utf-8')
      fileUrl = `/reports/${reportId}.html`
    } else {
      // Generate Excel XML format
      const excelContent = generateExcelXML(data)
      filePath = path.join(reportsDir, `${reportId}.xml`)
      fs.writeFileSync(filePath, excelContent, 'utf-8')
      fileUrl = `/reports/${reportId}.xml`
    }

    // Update report with file URL
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'COMPLETED',
        fileUrl,
        completedAt: new Date(),
      },
    })

    return fileUrl
  } catch (error) {
    console.error('Report generation failed:', error)

    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'FAILED' },
    })

    throw error
  }
}
