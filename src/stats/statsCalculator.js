/**
 * Statistics Calculator
 *
 * Calculates various statistics from collected GitHub data.
 * Computes metrics such as total commits, repositories created, languages used,
 * most active days, contribution streaks, and other interesting insights for the recap.
 */

import { format, parseISO, getDay, getMonth, startOfDay } from 'date-fns'

/**
 * Calculates the total number of commits.
 *
 * @param {Array} commits - Array of commit objects
 * @returns {number} Total commit count
 */
export function calculateTotalCommits(commits) {
  return commits.length
}

/**
 * Gets the top repositories by commit count.
 *
 * How we group data efficiently:
 * - Use a Map or object to count commits per repo in O(n) time
 * - Single pass through commits array
 * - Then convert to array and sort once
 * - Much more efficient than nested loops
 *
 * @param {Array} commits - Array of commit objects with 'repo' property
 * @param {number} limit - Number of top repos to return (default: 5)
 * @returns {Array} Array of { repo, count, percentage } objects
 */
export function getTopRepositories(commits, limit = 5) {
  if (commits.length === 0) return []

  // Group commits by repo name
  const repoCounts = {}
  commits.forEach((commit) => {
    const repoName = commit.repo
    repoCounts[repoName] = (repoCounts[repoName] || 0) + 1
  })

  // Convert to array and sort by count
  const repos = Object.entries(repoCounts)
    .map(([repo, count]) => ({
      repo,
      count,
      percentage: (count / commits.length) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  // Round percentages to 1 decimal place
  repos.forEach((repo) => {
    repo.percentage = Math.round(repo.percentage * 10) / 10
  })

  return repos
}

/**
 * Gets the most active day (date with most commits).
 *
 * Date manipulation with date-fns:
 * - parseISO: Converts ISO 8601 string to Date object
 * - format: Formats date to YYYY-MM-DD string
 * - getDay: Gets day of week (0=Sunday, 6=Saturday)
 * - We use startOfDay to normalize times to midnight for accurate grouping
 *
 * @param {Array} commits - Array of commit objects with 'date' property (ISO string)
 * @returns {Object|null} { date, count, dayName } or null if no commits
 */
export function getMostActiveDay(commits) {
  if (commits.length === 0) return null

  // Group commits by date (YYYY-MM-DD format)
  const dateCounts = {}
  commits.forEach((commit) => {
    const date = parseISO(commit.date)
    const dateKey = format(startOfDay(date), 'yyyy-MM-dd')
    dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1
  })

  // Find date with most commits
  let maxDate = null
  let maxCount = 0

  Object.entries(dateCounts).forEach(([date, count]) => {
    if (count > maxCount) {
      maxCount = count
      maxDate = date
    }
  })

  if (!maxDate) return null

  // Get day name using date-fns
  const dateObj = parseISO(maxDate)
  const dayName = format(dateObj, 'EEEE') // Full day name (Monday, Tuesday, etc.)

  return {
    date: maxDate,
    count: maxCount,
    dayName,
  }
}

/**
 * Gets the most active month.
 *
 * @param {Array} commits - Array of commit objects with 'date' property
 * @returns {Object|null} { month, monthName, count } or null if no commits
 */
export function getMostActiveMonth(commits) {
  if (commits.length === 0) return null

  // Group commits by month (YYYY-MM format)
  const monthCounts = {}
  commits.forEach((commit) => {
    const date = parseISO(commit.date)
    const monthKey = format(date, 'yyyy-MM')
    monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1
  })

  // Find month with most commits
  let maxMonth = null
  let maxCount = 0

  Object.entries(monthCounts).forEach(([month, count]) => {
    if (count > maxCount) {
      maxCount = count
      maxMonth = month
    }
  })

  if (!maxMonth) return null

  // Get month name using date-fns
  const dateObj = parseISO(maxMonth + '-01') // Add day to make valid date
  const monthName = format(dateObj, 'MMMM') // Full month name (January, February, etc.)

  return {
    month: maxMonth,
    monthName,
    count: maxCount,
  }
}

/**
 * Calculates the longest consecutive day streak with at least 1 commit.
 *
 * The streak calculation algorithm:
 * 1. Extract unique dates from commits (normalize to YYYY-MM-DD)
 * 2. Sort dates chronologically
 * 3. Loop through dates and track consecutive days
 * 4. Keep track of longest streak found
 * 5. Return the longest one
 *
 * Edge cases handled:
 * - No commits: returns null
 * - Single day: returns streak of 1 day
 * - Multiple streaks: returns the longest one
 * - Gaps in dates: resets streak counter
 *
 * @param {Array} commits - Array of commit objects with 'date' property
 * @returns {Object|null} { days, startDate, endDate } or null if no commits
 */
export function calculateLongestStreak(commits) {
  if (commits.length === 0) return null

  // Step 1: Extract unique dates and normalize to YYYY-MM-DD
  const uniqueDates = new Set()
  commits.forEach((commit) => {
    const date = parseISO(commit.date)
    const dateKey = format(startOfDay(date), 'yyyy-MM-dd')
    uniqueDates.add(dateKey)
  })

  // Step 2: Sort dates chronologically
  const sortedDates = Array.from(uniqueDates).sort()

  // Edge case: single day
  if (sortedDates.length === 1) {
    return {
      days: 1,
      startDate: sortedDates[0],
      endDate: sortedDates[0],
    }
  }

  // Step 3: Find longest consecutive streak
  let longestStreak = 1
  let currentStreak = 1
  let streakStart = sortedDates[0]
  let longestStreakStart = sortedDates[0]
  let longestStreakEnd = sortedDates[0]

  for (let i = 1; i < sortedDates.length; i++) {
    const currentDate = parseISO(sortedDates[i])
    const previousDate = parseISO(sortedDates[i - 1])

    // Calculate days difference
    const daysDiff =
      (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysDiff === 1) {
      // Consecutive day - continue streak
      currentStreak++
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak
        longestStreakStart = streakStart
        longestStreakEnd = sortedDates[i]
      }
    } else {
      // Gap found - reset streak
      currentStreak = 1
      streakStart = sortedDates[i]
    }
  }

  return {
    days: longestStreak,
    startDate: longestStreakStart,
    endDate: longestStreakEnd,
  }
}

/**
 * Gets commit counts by day of week.
 *
 * @param {Array} commits - Array of commit objects with 'date' property
 * @returns {Array} Array of { day, count } objects, sorted Monday-Sunday
 */
export function getCommitsByDayOfWeek(commits) {
  if (commits.length === 0) return []

  // Day names in order (Monday = 1, Sunday = 0)
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]

  // Initialize counts for each day
  const dayCounts = {}
  dayNames.forEach((day) => {
    dayCounts[day] = 0
  })

  // Count commits by day of week
  commits.forEach((commit) => {
    const date = parseISO(commit.date)
    const dayIndex = getDay(date) // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const dayName = dayNames[dayIndex]
    dayCounts[dayName] = (dayCounts[dayName] || 0) + 1
  })

  // Convert to array and sort: Monday first, then Tuesday, ..., Sunday last
  // We need to reorder: Monday (1) through Saturday (6), then Sunday (0)
  const orderedDays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]

  return orderedDays.map((day) => ({
    day,
    count: dayCounts[day],
  }))
}

/**
 * Gets language breakdown from commits.
 *
 * Note: This requires repo metadata with language information.
 * Since commits don't include language, we need to pass a repoLanguages map.
 *
 * @param {Array} commits - Array of commit objects with 'repo' property
 * @param {Object} repoLanguages - Map of repo full_name to language
 * @returns {Array} Top 5 languages: [{ language, count, percentage }]
 */
export function getLanguageBreakdown(commits, repoLanguages = {}) {
  if (commits.length === 0) return []

  // Count commits per language
  const languageCounts = {}
  commits.forEach((commit) => {
    const language = repoLanguages[commit.repo] || 'Unknown'
    languageCounts[language] = (languageCounts[language] || 0) + 1
  })

  // Convert to array, sort, and get top 5
  const languages = Object.entries(languageCounts)
    .map(([language, count]) => ({
      language,
      count,
      percentage: (count / commits.length) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Round percentages to 1 decimal place
  languages.forEach((lang) => {
    lang.percentage = Math.round(lang.percentage * 10) / 10
  })

  return languages
}
