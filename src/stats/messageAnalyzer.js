/**
 * Commit Message Analyzer
 *
 * Analyzes commit messages to extract insights and patterns.
 * Identifies common themes, emoji usage, message lengths, and other
 * interesting patterns in commit messages throughout the year.
 */

/**
 * Common stopwords to filter out from commit messages.
 *
 * The stopword filtering approach:
 * - Stopwords are common words that don't add semantic meaning
 * - Words like "the", "a", "and" appear frequently but aren't informative
 * - Filtering them helps identify the actual meaningful words in commits
 * - This is a standard technique in natural language processing (NLP)
 */
const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'are',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'should',
  'could',
  'may',
  'might',
  'can',
  'this',
  'that',
  'these',
  'those',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
])

/**
 * Checks if a string looks like a version number.
 *
 * Why we filter version numbers:
 * - Version numbers like "v1.0", "2.3.1" are common but not meaningful
 * - They don't tell us about coding patterns or themes
 * - Filtering them helps focus on actual code-related words
 *
 * @param {string} word - Word to check
 * @returns {boolean} True if word looks like a version number
 */
function isVersionNumber(word) {
  // Match patterns like: v1.0, 2.3.1, v1.2.3, etc.
  return /^v?\d+\.\d+(\.\d+)?$/.test(word)
}

/**
 * Extracts and processes words from commit messages.
 *
 * Text processing best practices:
 * - Convert to lowercase for consistent matching
 * - Remove punctuation and special characters
 * - Split on whitespace and filter empty strings
 * - Normalize words to their base form when possible
 * - This ensures "Fix", "fix", and "FIX" are treated as the same word
 *
 * @param {string} message - Commit message
 * @returns {Array} Array of processed words
 */
function extractWords(message) {
  // Convert to lowercase and remove special characters
  const cleaned = message
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .trim()

  // Split into words and filter empty strings
  return cleaned.split(/\s+/).filter((word) => word.length > 0)
}

/**
 * Gets the top words from commit messages.
 *
 * Why we filter short words:
 * - Words shorter than 3 characters are often abbreviations or noise
 * - They don't provide meaningful insights about coding patterns
 * - Examples: "a", "an", "it", "is" are filtered out
 * - This helps focus on substantial, meaningful words
 *
 * @param {Array} commits - Array of commit objects with 'message' property
 * @param {number} limit - Number of top words to return (default: 10)
 * @returns {Array} Array of { word, count } objects, sorted by count
 */
export function getTopWords(commits, limit = 10) {
  if (commits.length === 0) return []

  const wordCounts = {}

  // Process all commit messages
  commits.forEach((commit) => {
    const words = extractWords(commit.message)

    words.forEach((word) => {
      // Filter criteria:
      // 1. Not a stopword
      // 2. At least 3 characters long
      // 3. Not a version number
      if (
        !STOPWORDS.has(word) &&
        word.length >= 3 &&
        !isVersionNumber(word)
      ) {
        wordCounts[word] = (wordCounts[word] || 0) + 1
      }
    })
  })

  // Convert to array, sort by count, and return top N
  return Object.entries(wordCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * Gets commit message statistics.
 *
 * @param {Array} commits - Array of commit objects with 'message' property
 * @returns {Object} Statistics object with avgLength, shortestMsg, longestMsg, topFirstWords
 */
export function getCommitMessageStats(commits) {
  if (commits.length === 0) {
    return {
      avgLength: 0,
      shortestMsg: null,
      longestMsg: null,
      topFirstWords: [],
    }
  }

  let totalWords = 0
  let shortestMsg = commits[0].message
  let longestMsg = commits[0].message
  const firstWordCounts = {}

  commits.forEach((commit) => {
    const message = commit.message.trim()
    const words = extractWords(message)

    // Count total words
    totalWords += words.length

    // Track shortest and longest messages
    if (message.length < shortestMsg.length) {
      shortestMsg = message
    }
    if (message.length > longestMsg.length) {
      longestMsg = message
    }

    // Count first words (after filtering)
    if (words.length > 0) {
      const firstWord = words[0]
      // Only count if it's not a stopword and meaningful
      if (!STOPWORDS.has(firstWord) && firstWord.length >= 3) {
        firstWordCounts[firstWord] = (firstWordCounts[firstWord] || 0) + 1
      }
    }
  })

  // Calculate average
  const avgLength = Math.round((totalWords / commits.length) * 10) / 10

  // Get top first words
  const topFirstWords = Object.entries(firstWordCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    avgLength,
    shortestMsg: shortestMsg.length > 80 ? shortestMsg.substring(0, 77) + '...' : shortestMsg,
    longestMsg: longestMsg.length > 80 ? longestMsg.substring(0, 77) + '...' : longestMsg,
    topFirstWords,
  }
}
