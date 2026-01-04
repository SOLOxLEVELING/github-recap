/**
 * Save Recap Utility
 *
 * Provides functions to save the GitHub recap to files in various formats.
 */

import fs from 'fs/promises'
import path from 'path'
import { format, parseISO } from 'date-fns'
import chalk from 'chalk'

/**
 * Creates a text-formatted recap with boxes and formatting.
 */
function formatRecapAsText(stats, year) {
  const lines = []

  // Header
  lines.push('╔═══════════════════════════════════════════════════════════╗')
  lines.push(
    `║              🎉 YOUR ${year} GITHUB YEAR IN REVIEW 🎉        ║`
  )
  lines.push('╠═══════════════════════════════════════════════════════════╣')
  lines.push('║                                                           ║')

  // The Numbers
  lines.push('║  📊 THE NUMBERS                                           ║')
  lines.push(
    `║     • ${stats.totalCommits.toLocaleString()} commits across ${stats.totalRepos} repositories`
  )
  if (stats.longestStreak) {
    const startDate = format(parseISO(stats.longestStreak.startDate), 'MMM d')
    const endDate = format(parseISO(stats.longestStreak.endDate), 'MMM d')
    lines.push(
      `║     • ${stats.longestStreak.days}-day longest streak (${startDate} - ${endDate})`
    )
  }
  if (stats.mostActiveDay) {
    lines.push(
      `║     • Most active: ${stats.mostActiveDay.dayName} with ${stats.mostActiveDay.count} commits`
    )
  }
  lines.push('║                                                           ║')

  // Top Repository
  if (stats.topRepos && stats.topRepos.length > 0) {
    const topRepo = stats.topRepos[0]
    lines.push('║  🏆 TOP REPOSITORY                                        ║')
    lines.push(
      `║     ${topRepo.repo} - ${topRepo.count.toLocaleString()} commits (${topRepo.percentage}%)`
    )
    lines.push('║                                                           ║')
  }

  // Coding Style
  lines.push('║  💬 YOUR CODING STYLE                                     ║')
  if (stats.topWords && stats.topWords.length > 0) {
    const topWord = stats.topWords[0]
    lines.push(
      `║     • "${topWord.word}" appeared ${topWord.count} times in commits`
    )
  }
  if (stats.messageStats) {
    lines.push(
      `║     • Average ${stats.messageStats.avgLength} words per commit message`
    )
  }
  if (stats.mostActiveDay) {
    const date = format(parseISO(stats.mostActiveDay.date), 'MMM d, yyyy')
    lines.push(
      `║     • Most productive day: ${date} (${stats.mostActiveDay.count} commits)`
    )
  }
  lines.push('║                                                           ║')

  // Top 5 Repositories
  if (stats.topRepos && stats.topRepos.length > 0) {
    lines.push('║  🎯 TOP 5 REPOSITORIES                                    ║')
    stats.topRepos.slice(0, 5).forEach((repo, index) => {
      const name = repo.repo.length > 30 ? repo.repo.substring(0, 27) + '...' : repo.repo
      const countStr = repo.count.toLocaleString()
      const padding = ' '.repeat(Math.max(0, 30 - name.length))
      lines.push(
        `║     ${index + 1}. ${name}${padding} ${countStr.padStart(6)} commits (${repo.percentage}%) ║`
      )
    })
    lines.push('║                                                           ║')
  }

  // Encouraging message
  let message = ''
  if (stats.totalCommits === 0) {
    message = 'Every commit is a step forward! Keep building! 🌱'
  } else if (stats.totalCommits <= 50) {
    message = 'Every commit is a step forward! Keep building! 🌱'
  } else if (stats.totalCommits <= 150) {
    message = 'Solid consistency! You\'re building momentum! 💪'
  } else if (stats.totalCommits <= 300) {
    message = 'Impressive dedication! You shipped real work! 🔥'
  } else if (stats.totalCommits <= 500) {
    message = 'Outstanding productivity! You\'re a shipping machine! 🚀'
  } else {
    message = 'Absolutely legendary! Your commit graph is on fire! 🏆'
  }
  lines.push(`║  ⭐ ${message}`)
  lines.push('║                                                           ║')
  lines.push('╚═══════════════════════════════════════════════════════════╝')

  return lines.join('\n')
}

/**
 * Saves recap as a formatted text file.
 *
 * @param {Object} stats - Statistics object
 * @param {number} year - Year of the recap
 * @returns {Promise<string>} File path where recap was saved
 */
export async function saveRecapToFile(stats, year) {
  const content = formatRecapAsText(stats, year)
  const filename = `github-recap-${year}.txt`
  const filepath = path.join(process.cwd(), filename)

  await fs.writeFile(filepath, content, 'utf-8')
  return filepath
}

/**
 * Saves recap as JSON file with all raw stats data.
 *
 * @param {Object} stats - Statistics object
 * @param {number} year - Year of the recap
 * @returns {Promise<string>} File path where recap was saved
 */
export async function saveRecapAsJSON(stats, year) {
  const data = {
    year,
    generatedAt: new Date().toISOString(),
    stats,
  }

  const filename = `github-recap-${year}.json`
  const filepath = path.join(process.cwd(), filename)

  await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8')
  return filepath
}
