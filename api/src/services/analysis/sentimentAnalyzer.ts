import { prisma } from '../../utils/prisma'

// AWS Comprehend types
interface ComprehendSentiment {
  Sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED'
  SentimentScore: {
    Positive: number
    Negative: number
    Neutral: number
    Mixed: number
  }
}

interface SentimentResult {
  postId: string
  content: string
  sentiment: string
  score: number
  confidence: number
  postedAt: string
}

interface SentimentSummary {
  accountId: string
  period: string
  totalPosts: number
  analyzedPosts: number
  distribution: {
    positive: number
    negative: number
    neutral: number
    mixed: number
  }
  averageScore: number
  trend: 'improving' | 'declining' | 'stable'
  recentPosts: SentimentResult[]
}

// Simple sentiment analysis for when AWS Comprehend is not configured
function analyzeSentimentLocal(text: string): {
  sentiment: string
  score: number
  confidence: number
} {
  const positiveWords = [
    '嬉しい', '楽しい', '素晴らしい', '最高', 'ありがとう', '感謝', '幸せ', '良い',
    'happy', 'great', 'awesome', 'amazing', 'love', 'excellent', 'wonderful', 'fantastic',
    'good', 'nice', 'beautiful', 'perfect', 'best', 'thank', 'thanks', 'appreciate',
  ]

  const negativeWords = [
    '悲しい', '辛い', '最悪', '嫌い', '困った', '残念', '怒り', '悪い',
    'sad', 'bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'angry',
    'disappointing', 'frustrated', 'annoyed', 'upset', 'sorry', 'unfortunately',
  ]

  const lowerText = text.toLowerCase()
  let positiveCount = 0
  let negativeCount = 0

  for (const word of positiveWords) {
    if (lowerText.includes(word)) positiveCount++
  }

  for (const word of negativeWords) {
    if (lowerText.includes(word)) negativeCount++
  }

  const total = positiveCount + negativeCount

  if (total === 0) {
    return { sentiment: 'NEUTRAL', score: 0, confidence: 0.5 }
  }

  const score = (positiveCount - negativeCount) / total

  let sentiment: string
  if (score > 0.3) {
    sentiment = 'POSITIVE'
  } else if (score < -0.3) {
    sentiment = 'NEGATIVE'
  } else if (positiveCount > 0 && negativeCount > 0) {
    sentiment = 'MIXED'
  } else {
    sentiment = 'NEUTRAL'
  }

  const confidence = Math.min(0.5 + (total * 0.1), 0.95)

  return { sentiment, score, confidence }
}

async function analyzeSentimentAWS(text: string): Promise<{
  sentiment: string
  score: number
  confidence: number
}> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const region = process.env.AWS_REGION || 'ap-northeast-1'

  if (!accessKeyId || !secretAccessKey) {
    // Fall back to local analysis if AWS is not configured
    return analyzeSentimentLocal(text)
  }

  try {
    // Dynamic import for AWS SDK
    const { ComprehendClient, DetectSentimentCommand } = await import(
      '@aws-sdk/client-comprehend'
    )

    const client = new ComprehendClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    // Truncate text to 5000 bytes (AWS Comprehend limit)
    const truncatedText = text.slice(0, 4500)

    // Detect language and use appropriate language code
    const languageCode = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)
      ? 'ja'
      : 'en'

    const command = new DetectSentimentCommand({
      Text: truncatedText,
      LanguageCode: languageCode,
    })

    const response = await client.send(command)

    const sentimentScores = response.SentimentScore || {
      Positive: 0,
      Negative: 0,
      Neutral: 0,
      Mixed: 0,
    }

    // Calculate score from -1 to 1
    const score =
      (sentimentScores.Positive || 0) - (sentimentScores.Negative || 0)

    // Get confidence for the detected sentiment
    const sentiment = response.Sentiment || 'NEUTRAL'
    const confidenceMap: Record<string, number> = {
      POSITIVE: sentimentScores.Positive || 0,
      NEGATIVE: sentimentScores.Negative || 0,
      NEUTRAL: sentimentScores.Neutral || 0,
      MIXED: sentimentScores.Mixed || 0,
    }

    return {
      sentiment,
      score,
      confidence: confidenceMap[sentiment] || 0.5,
    }
  } catch (error) {
    console.error('AWS Comprehend error:', error)
    // Fall back to local analysis
    return analyzeSentimentLocal(text)
  }
}

export async function analyzePostSentiment(
  postId: string
): Promise<SentimentResult | null> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      content: true,
      postedAt: true,
    },
  })

  if (!post || !post.content) {
    return null
  }

  const { sentiment, score, confidence } = await analyzeSentimentAWS(post.content)

  // Update post with sentiment data
  await prisma.post.update({
    where: { id: postId },
    data: {
      sentimentScore: score,
      sentimentLabel: sentiment,
    },
  })

  return {
    postId: post.id,
    content: post.content,
    sentiment,
    score,
    confidence,
    postedAt: post.postedAt.toISOString(),
  }
}

export async function analyzeSentimentBatch(
  accountId: string,
  days: number = 30
): Promise<SentimentSummary> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const midDate = new Date()
  midDate.setDate(midDate.getDate() - Math.floor(days / 2))

  // Get posts for the period
  const posts = await prisma.post.findMany({
    where: {
      accountId,
      postedAt: {
        gte: startDate,
      },
    },
    select: {
      id: true,
      content: true,
      sentimentScore: true,
      sentimentLabel: true,
      postedAt: true,
    },
    orderBy: { postedAt: 'desc' },
  })

  if (posts.length === 0) {
    return {
      accountId,
      period: `${days}days`,
      totalPosts: 0,
      analyzedPosts: 0,
      distribution: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
      averageScore: 0,
      trend: 'stable',
      recentPosts: [],
    }
  }

  // Analyze posts that haven't been analyzed yet
  const results: SentimentResult[] = []
  const distribution = { positive: 0, negative: 0, neutral: 0, mixed: 0 }
  let totalScore = 0
  let analyzedCount = 0

  for (const post of posts) {
    let sentiment: string
    let score: number
    let confidence: number

    if (post.sentimentLabel && post.sentimentScore !== null) {
      // Use existing analysis
      sentiment = post.sentimentLabel
      score = post.sentimentScore
      confidence = 0.8
    } else if (post.content) {
      // Analyze new post
      const analysis = await analyzeSentimentAWS(post.content)
      sentiment = analysis.sentiment
      score = analysis.score
      confidence = analysis.confidence

      // Update post
      await prisma.post.update({
        where: { id: post.id },
        data: {
          sentimentScore: score,
          sentimentLabel: sentiment,
        },
      })
    } else {
      continue
    }

    // Update distribution
    const sentimentKey = sentiment.toLowerCase() as keyof typeof distribution
    if (sentimentKey in distribution) {
      distribution[sentimentKey]++
    }

    totalScore += score
    analyzedCount++

    results.push({
      postId: post.id,
      content: post.content || '',
      sentiment,
      score,
      confidence,
      postedAt: post.postedAt.toISOString(),
    })
  }

  // Calculate trend
  const recentPosts = posts.filter((p) => p.postedAt >= midDate)
  const olderPosts = posts.filter((p) => p.postedAt < midDate)

  const recentAvg =
    recentPosts.length > 0
      ? recentPosts.reduce((sum, p) => sum + (p.sentimentScore || 0), 0) /
        recentPosts.length
      : 0

  const olderAvg =
    olderPosts.length > 0
      ? olderPosts.reduce((sum, p) => sum + (p.sentimentScore || 0), 0) /
        olderPosts.length
      : 0

  let trend: 'improving' | 'declining' | 'stable'
  const diff = recentAvg - olderAvg
  if (diff > 0.1) {
    trend = 'improving'
  } else if (diff < -0.1) {
    trend = 'declining'
  } else {
    trend = 'stable'
  }

  return {
    accountId,
    period: `${days}days`,
    totalPosts: posts.length,
    analyzedPosts: analyzedCount,
    distribution,
    averageScore: analyzedCount > 0 ? totalScore / analyzedCount : 0,
    trend,
    recentPosts: results.slice(0, 10),
  }
}
