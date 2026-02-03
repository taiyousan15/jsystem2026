import { prisma } from '../../utils/prisma'

interface KeywordResult {
  keyword: string
  count: number
  score: number
  trend: 'up' | 'down' | 'stable'
}

interface KeywordAnalysisResult {
  accountId: string
  period: string
  totalPosts: number
  keywords: KeywordResult[]
  hashtags: KeywordResult[]
  mentions: KeywordResult[]
}

// Japanese stop words
const STOP_WORDS = new Set([
  'の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ',
  'ある', 'いる', 'も', 'な', 'する', 'から', 'だ', 'こと', 'として', 'い',
  'や', 'など', 'なる', 'へ', 'か', 'だ', 'よう', 'という', 'これ', 'それ',
  'あの', 'その', 'この', 'どの', 'ここ', 'そこ', 'あそこ', 'どこ',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
  'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his',
  'she', 'her', 'it', 'its', 'they', 'them', 'their', 'this', 'that',
])

function tokenize(text: string): string[] {
  // Remove URLs
  const withoutUrls = text.replace(/https?:\/\/\S+/g, '')

  // Extract words (supports Japanese and English)
  const words = withoutUrls
    .toLowerCase()
    .split(/[\s\n\r\t,.!?;:()[\]{}'"「」『』（）、。！？]+/)
    .filter((word) => {
      if (word.length < 2) return false
      if (STOP_WORDS.has(word)) return false
      if (/^\d+$/.test(word)) return false
      return true
    })

  return words
}

function extractHashtags(text: string): string[] {
  const hashtags = text.match(/#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g) || []
  return hashtags.map((h) => h.toLowerCase())
}

function extractMentions(text: string): string[] {
  const mentions = text.match(/@[\w]+/g) || []
  return mentions.map((m) => m.toLowerCase())
}

function countOccurrences(items: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1)
  }
  return counts
}

function calculateTrend(
  currentCount: number,
  previousCount: number
): 'up' | 'down' | 'stable' {
  const diff = currentCount - previousCount
  const threshold = Math.max(1, previousCount * 0.1)

  if (diff > threshold) return 'up'
  if (diff < -threshold) return 'down'
  return 'stable'
}

export async function analyzeKeywords(
  accountId: string,
  days: number = 30
): Promise<KeywordAnalysisResult> {
  const endDate = new Date()
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
        lte: endDate,
      },
    },
    select: {
      content: true,
      postedAt: true,
    },
    orderBy: { postedAt: 'desc' },
  })

  if (posts.length === 0) {
    return {
      accountId,
      period: `${days}days`,
      totalPosts: 0,
      keywords: [],
      hashtags: [],
      mentions: [],
    }
  }

  // Split posts into current and previous periods for trend calculation
  const currentPosts = posts.filter((p) => p.postedAt >= midDate)
  const previousPosts = posts.filter((p) => p.postedAt < midDate)

  // Extract and count keywords
  const allWords: string[] = []
  const currentWords: string[] = []
  const previousWords: string[] = []

  const allHashtags: string[] = []
  const currentHashtags: string[] = []
  const previousHashtags: string[] = []

  const allMentions: string[] = []
  const currentMentions: string[] = []
  const previousMentions: string[] = []

  for (const post of posts) {
    const content = post.content || ''
    const words = tokenize(content)
    const hashtags = extractHashtags(content)
    const mentions = extractMentions(content)

    allWords.push(...words)
    allHashtags.push(...hashtags)
    allMentions.push(...mentions)

    if (post.postedAt >= midDate) {
      currentWords.push(...words)
      currentHashtags.push(...hashtags)
      currentMentions.push(...mentions)
    } else {
      previousWords.push(...words)
      previousHashtags.push(...hashtags)
      previousMentions.push(...mentions)
    }
  }

  // Count occurrences
  const wordCounts = countOccurrences(allWords)
  const currentWordCounts = countOccurrences(currentWords)
  const previousWordCounts = countOccurrences(previousWords)

  const hashtagCounts = countOccurrences(allHashtags)
  const currentHashtagCounts = countOccurrences(currentHashtags)
  const previousHashtagCounts = countOccurrences(previousHashtags)

  const mentionCounts = countOccurrences(allMentions)
  const currentMentionCounts = countOccurrences(currentMentions)
  const previousMentionCounts = countOccurrences(previousMentions)

  // Calculate TF-IDF-like scores and build results
  const totalWords = allWords.length || 1

  const keywords: KeywordResult[] = Array.from(wordCounts.entries())
    .map(([keyword, count]) => ({
      keyword,
      count,
      score: (count / totalWords) * Math.log(posts.length / (count + 1) + 1) * 100,
      trend: calculateTrend(
        currentWordCounts.get(keyword) || 0,
        previousWordCounts.get(keyword) || 0
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)

  const hashtags: KeywordResult[] = Array.from(hashtagCounts.entries())
    .map(([keyword, count]) => ({
      keyword,
      count,
      score: count,
      trend: calculateTrend(
        currentHashtagCounts.get(keyword) || 0,
        previousHashtagCounts.get(keyword) || 0
      ),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  const mentions: KeywordResult[] = Array.from(mentionCounts.entries())
    .map(([keyword, count]) => ({
      keyword,
      count,
      score: count,
      trend: calculateTrend(
        currentMentionCounts.get(keyword) || 0,
        previousMentionCounts.get(keyword) || 0
      ),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  return {
    accountId,
    period: `${days}days`,
    totalPosts: posts.length,
    keywords,
    hashtags,
    mentions,
  }
}
