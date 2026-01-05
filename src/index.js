#!/usr/bin/env node

/**
 * Main entry point for the GitHub Recap CLI tool.
 *
 * This file initializes the CLI application, sets up command-line argument parsing,
 * loads environment variables, and orchestrates the flow of data collection,
 * statistics calculation, and UI rendering to display the user's GitHub year in review.
 */

import React from 'react'
import chalk from 'chalk'
import boxen from 'boxen'
import { render } from 'ink'
import { format, parseISO } from 'date-fns'
import { testAuthentication } from './auth/githubAuth.js'
import { fetchAllRepos } from './data/fetchRepos.js'
import { collectAllCommits } from './data/dataCollector.js'
import { parseOptions } from './utils/cli.js'
import { RecapScreen } from './ui/RecapScreen.js'
import { saveRecapToFile, saveRecapAsJSON } from './utils/saveRecap.js'
import { clearCache } from './cache/cacheManager.js'
import {
  calculateTotalCommits,
  getTopRepositories,
  getMostActiveDay,
  getMostActiveMonth,
  calculateLongestStreak,
  getCommitsByDayOfWeek,
  getLanguageBreakdown,
} from './stats/statsCalculator.js'
import { getTopWords, getCommitMessageStats } from './stats/messageAnalyzer.js'

// Parse CLI options
const options = parseOptions()

/**
 * Main function that runs the GitHub Recap application.
 * Tests authentication and displays success/error messages.
 */
async function main() {
  try {
    // Handle --clear-cache flag
    if (options.clearCache) {
      console.log(chalk.yellow('🗑️  Clearing cache...\n'))
      try {
        const deletedFiles = await clearCache()
        if (deletedFiles.length > 0) {
          console.log(
            chalk.green(`✅ Cleared ${deletedFiles.length} cache file(s)\n`)
          )
          deletedFiles.forEach((file) => {
            console.log(chalk.gray(`   ${file}`))
          })
        } else {
          console.log(chalk.yellow('   No cache files found\n'))
        }
      } catch (error) {
        console.error(chalk.red(`❌ Error clearing cache: ${error.message}\n`))
        process.exit(1)
      }
      process.exit(0)
    }

    // Display welcome message
    console.log(chalk.cyan.bold('\n🎉 GitHub Recap - Year in Review\n'))

    // Test authentication with GitHub API
    console.log(chalk.yellow('🔐 Testing authentication...\n'))

    const username = await testAuthentication()

    // Display success message with username
    console.log(
      chalk.green('✅ Authentication successful!\n') +
        chalk.white(`   Logged in as: ${chalk.bold.cyan(username)}\n`)
    )

    // Determine target year (default to current year)
    const targetYear = options.year || new Date().getFullYear()

    // Display active options for debugging
    console.log(chalk.gray('📋 Active options:\n'))
    console.log(
      chalk.gray(`   Year: ${chalk.white(targetYear)}`) +
        (options.year ? '' : chalk.gray(' (default)'))
    )
    if (options.repo) {
      console.log(
        chalk.gray(`   Repository: ${chalk.white(options.repo)}`) +
          chalk.yellow(' (overrides all filtering)')
      )
    } else {
      console.log(
        chalk.gray(
          `   Public only: ${chalk.white(options.publicOnly ? 'Yes' : 'No')}`
        )
      )
      if (options.exclude && options.exclude.length > 0) {
        console.log(
          chalk.gray(`   Excluding: ${chalk.white(options.exclude.join(', '))}`)
        )
      }
    }
    console.log() // Add spacing

    let repos = []
    let targetRepo = null

    /**
     * Smart repository matching function
     *
     * Matching strategy (in order of priority):
     * 1. Exact full_name match: "username/repo-name" matches exactly
     * 2. Exact repo name match: "repo-name" matches any repo with that exact name
     * 3. Partial match: "port" matches "portfolio", "portfolio-site", etc.
     *
     * If multiple repos match a partial search, we return all matches
     * so the user can be prompted to be more specific.
     *
     * @param {Array} allRepos - Array of all available repositories
     * @param {string} searchPattern - The pattern to search for
     * @returns {Object} { match: repo | null, matches: repo[] }
     */
    function findRepository(allRepos, searchPattern) {
      // 1. Try exact full_name match (highest priority)
      const exactFullNameMatch = allRepos.find(
        (repo) => repo.full_name === searchPattern
      )
      if (exactFullNameMatch) {
        return { match: exactFullNameMatch, matches: [exactFullNameMatch] }
      }

      // 2. Try exact repo name match (second priority)
      const exactNameMatches = allRepos.filter(
        (repo) => repo.name === searchPattern
      )
      if (exactNameMatches.length === 1) {
        return { match: exactNameMatches[0], matches: exactNameMatches }
      }
      if (exactNameMatches.length > 1) {
        // Multiple repos with same name - return all for user to choose
        return { match: null, matches: exactNameMatches }
      }

      // 3. Try partial match (lowest priority)
      const partialMatches = allRepos.filter(
        (repo) =>
          repo.full_name.includes(searchPattern) ||
          repo.name.includes(searchPattern)
      )

      if (partialMatches.length === 1) {
        return { match: partialMatches[0], matches: partialMatches }
      }
      if (partialMatches.length > 1) {
        // Multiple partial matches - return all for user to choose
        return { match: null, matches: partialMatches }
      }

      // No match found
      return { match: null, matches: [] }
    }

    // Option parsing and filtering logic:
    // If --repo is specified, we need to fetch repos first to do smart matching
    // Then we use only the matched repository
    if (options.repo) {
      // Fetch all repos first (needed for smart matching)
      console.log(chalk.yellow('📦 Fetching repositories for matching...\n'))

      const allRepos = await fetchAllRepos({
        publicOnly: options.publicOnly || false,
        excludeRepos: options.exclude || [],
      })

      // Use smart matching to find the repository
      const { match, matches } = findRepository(allRepos, options.repo)

      if (match) {
        // Single match found - use collectAllCommits for this one repo
        targetRepo = match
        repos = [targetRepo]
        console.log(
          chalk.green(
            `✅ Found repository: ${chalk.bold(targetRepo.full_name)}\n`
          )
        )

        // Collect commits using the data collector (shows nice progress)
        // Pass the single repo directly to avoid fetching all repos
        const repoCommits = await collectAllCommits({
          year: targetYear,
          publicOnly: false, // Ignored when repoList is provided
          excludeRepos: [], // Ignored when repoList is provided
          repoList: [targetRepo], // Only process this one repo
          noCache: options.noCache || options.refresh || false,
          cacheMaxAge: options.cacheMaxAge || 24,
          batchSize: options.batchSize || 5,
          username: username,
        })

        // Calculate statistics for single repo
        console.log(chalk.yellow('\n📊 Calculating statistics...\n'))

        const repoLanguages = {}
        repoLanguages[targetRepo.full_name] = targetRepo.language || 'Unknown'

        const totalCommits = calculateTotalCommits(repoCommits)
        const topRepos = getTopRepositories(repoCommits, 5)
        const mostActiveDay = getMostActiveDay(repoCommits)
        const mostActiveMonth = getMostActiveMonth(repoCommits)
        const longestStreak = calculateLongestStreak(repoCommits)
        const commitsByDay = getCommitsByDayOfWeek(repoCommits)
        const topWords = getTopWords(repoCommits, 10)
        const messageStats = getCommitMessageStats(repoCommits)

        // Prepare stats object for RecapScreen
        const recapStats = {
          totalCommits,
          totalRepos: 1,
          topRepos,
          mostActiveDay,
          mostActiveMonth,
          longestStreak,
          commitsByDay,
          topWords,
          messageStats,
        }

        // Render animated RecapScreen
        console.log('\n')
        const { unmount: unmountRecap } = render(
          React.createElement(RecapScreen, {
            stats: recapStats,
            year: targetYear,
            noAnimation: options.noAnimation || false,
            onSave: async (stats, year) => {
              try {
                const txtPath = await saveRecapToFile(stats, year)
                const jsonPath = await saveRecapAsJSON(stats, year)
                console.log(chalk.green(`\n✅ Recap saved to:`))
                console.log(chalk.cyan(`   ${txtPath}`))
                console.log(chalk.cyan(`   ${jsonPath}\n`))
              } catch (error) {
                console.error(
                  chalk.red(`\n❌ Error saving recap: ${error.message}\n`)
                )
              }
            },
            onQuit: () => {
              unmountRecap()
              process.exit(0)
            },
          }),
          { exitOnCtrlC: true }
        )

        // Get date range
        let dateRange = 'N/A'
        if (repoCommits.length > 0) {
          const dates = repoCommits
            .map((c) => parseISO(c.date))
            .sort((a, b) => a - b)
          const firstDate = format(dates[0], 'MMM d, yyyy')
          const lastDate = format(dates[dates.length - 1], 'MMM d, yyyy')
          dateRange = `${firstDate} - ${lastDate}`
        }

        // Display statistics
        console.log('\n')

        // Overview
        const overviewLines = [
          chalk.cyan.bold('📈 Overview\n'),
          chalk.white(`Repository: ${chalk.blue.bold(targetRepo.full_name)}`),
          chalk.white(
            `Total Commits: ${chalk.green.bold(totalCommits.toLocaleString())}`
          ),
          chalk.white(`Date Range: ${chalk.green.bold(dateRange)}`),
        ]

        console.log(
          boxen(overviewLines.join('\n'), {
            title: chalk.cyan.bold('GitHub Recap Statistics'),
            titleAlignment: 'center',
            padding: 1,
            margin: { top: 0, bottom: 1 },
            borderStyle: 'round',
            borderColor: 'cyan',
          })
        )

        // Activity Patterns
        const activityLines = [chalk.cyan.bold('📅 Activity Patterns\n')]

        if (mostActiveDay) {
          activityLines.push(
            chalk.white(
              `Most Active Day: ${chalk.yellow.bold(
                mostActiveDay.dayName
              )} (${chalk.green.bold(
                format(parseISO(mostActiveDay.date), 'MMM d, yyyy')
              )}) with ${chalk.green.bold(mostActiveDay.count)} commits`
            )
          )
        }

        if (mostActiveMonth) {
          activityLines.push(
            chalk.white(
              `Most Active Month: ${chalk.yellow.bold(
                mostActiveMonth.monthName
              )} with ${chalk.green.bold(mostActiveMonth.count)} commits`
            )
          )
        }

        if (longestStreak) {
          activityLines.push(
            chalk.white(
              `Longest Streak: ${chalk.green.bold(
                longestStreak.days
              )} days (${chalk.yellow.bold(
                format(parseISO(longestStreak.startDate), 'MMM d')
              )} - ${chalk.yellow.bold(
                format(parseISO(longestStreak.endDate), 'MMM d')
              )})`
            )
          )
        }

        activityLines.push('')
        activityLines.push(chalk.yellow.bold('Commits by Day of Week:'))

        const maxDayCount = Math.max(...commitsByDay.map((d) => d.count), 1)
        commitsByDay.forEach(({ day, count }) => {
          const barLength = Math.round((count / maxDayCount) * 20)
          const bar = '█'.repeat(barLength)
          const percentage =
            totalCommits > 0 ? ((count / totalCommits) * 100).toFixed(1) : 0
          activityLines.push(
            chalk.white(
              `  ${day.padEnd(9)} ${chalk.green(
                bar.padEnd(20)
              )} ${chalk.green.bold(count)} (${percentage}%)`
            )
          )
        })

        console.log(
          boxen(activityLines.join('\n'), {
            padding: 1,
            margin: { top: 0, bottom: 1 },
            borderStyle: 'round',
            borderColor: 'blue',
          })
        )

        // Top Words
        if (topWords.length > 0) {
          const wordsLines = [
            chalk.cyan.bold('💬 Top Words in Commit Messages\n'),
          ]

          topWords.forEach((item, index) => {
            wordsLines.push(
              chalk.white(
                `  ${(index + 1).toString().padStart(2)}. ${chalk.yellow.bold(
                  item.word.padEnd(15)
                )} ${chalk.green.bold(item.count)} times`
              )
            )
          })

          console.log(
            boxen(wordsLines.join('\n'), {
              padding: 1,
              margin: { top: 0, bottom: 1 },
              borderStyle: 'round',
              borderColor: 'magenta',
            })
          )
        }

        // Commit Insights
        const insightsLines = [
          chalk.cyan.bold('💡 Commit Insights\n'),
          chalk.white(
            `Average Message Length: ${chalk.green.bold(
              messageStats.avgLength
            )} words`
          ),
        ]

        if (messageStats.topFirstWords.length > 0) {
          const topFirst = messageStats.topFirstWords[0]
          insightsLines.push('')
          insightsLines.push(
            chalk.white(
              `Most Common First Word: ${chalk.yellow.bold(
                `"${topFirst.word}"`
              )} (${chalk.green.bold(topFirst.count)} times)`
            )
          )
          insightsLines.push(
            chalk.gray(
              `   💬 You said "${topFirst.word}" ${topFirst.count} times!`
            )
          )
        }

        console.log(
          boxen(insightsLines.join('\n'), {
            padding: 1,
            margin: { top: 0, bottom: 1 },
            borderStyle: 'round',
            borderColor: 'yellow',
          })
        )

        console.log() // Final spacing
        return // Exit early after showing summary
      } else if (matches.length > 1) {
        // Multiple matches found - show list and ask for specificity
        console.error(
          chalk.yellow(`⚠️  Multiple repositories match "${options.repo}":\n\n`)
        )
        matches.forEach((repo, index) => {
          const language = repo.language
            ? chalk.gray(` (${repo.language})`)
            : ''
          const visibility = repo.private
            ? chalk.red(' [private]')
            : chalk.green(' [public]')
          console.log(
            `   ${index + 1}. ${chalk.blue.bold(
              repo.full_name
            )}${language}${visibility}`
          )
        })
        console.error(
          chalk.red(
            `\n❌ Please be more specific using the full repository name.\n` +
              `   Example: ${chalk.bold(`--repo "${matches[0].full_name}"`)}\n`
          )
        )
        process.exit(1)
      } else {
        // No match found - show helpful suggestions
        console.error(
          chalk.red(`❌ Repository "${options.repo}" not found!\n\n`)
        )

        // Find similar repo names (fuzzy matching)
        const suggestions = allRepos
          .map((repo) => ({
            repo,
            // Simple similarity: check if repo name contains any part of search
            score: repo.name.toLowerCase().includes(options.repo.toLowerCase())
              ? 1
              : 0,
          }))
          .filter((item) => item.score > 0)
          .slice(0, 5) // Show top 5 suggestions

        if (suggestions.length > 0) {
          console.error(chalk.yellow('💡 Did you mean one of these?\n'))
          suggestions.forEach((item, index) => {
            console.error(
              `   ${index + 1}. ${chalk.blue.bold(item.repo.full_name)}`
            )
          })
          console.error(
            chalk.gray(
              `\n   Use: ${chalk.bold(
                `--repo "${suggestions[0].repo.full_name}"`
              )}\n`
            )
          )
        } else {
          console.error(
            chalk.gray(
              `   Run without --repo to see all available repositories.\n`
            )
          )
        }
        process.exit(1)
      }
    } else {
      // --repo NOT specified, so collect commits from all repos
      // The collectAllCommits function will handle fetching repos and commits
      // with a nice loading spinner showing progress
      const allCommits = await collectAllCommits({
        year: targetYear,
        publicOnly: options.publicOnly || false,
        excludeRepos: options.exclude || [],
        noCache: options.noCache || options.refresh || false,
        cacheMaxAge: options.cacheMaxAge || 24,
        batchSize: options.batchSize || 5,
        username: username,
      })

      // Get repos list for statistics (we need repo metadata for language breakdown)
      repos = await fetchAllRepos({
        publicOnly: options.publicOnly || false,
        excludeRepos: options.exclude || [],
      })

      // Create repo language map for language breakdown
      const repoLanguages = {}
      repos.forEach((repo) => {
        repoLanguages[repo.full_name] = repo.language || 'Unknown'
      })

      // Calculate all statistics
      console.log(chalk.yellow('\n📊 Calculating statistics...\n'))

      const totalCommits = calculateTotalCommits(allCommits)
      const topRepos = getTopRepositories(allCommits, 5)
      const mostActiveDay = getMostActiveDay(allCommits)
      const mostActiveMonth = getMostActiveMonth(allCommits)
      const longestStreak = calculateLongestStreak(allCommits)
      const commitsByDay = getCommitsByDayOfWeek(allCommits)
      const languageBreakdown = getLanguageBreakdown(allCommits, repoLanguages)
      const topWords = getTopWords(allCommits, 10)
      const messageStats = getCommitMessageStats(allCommits)

      // Get date range
      let dateRange = 'N/A'
      if (allCommits.length > 0) {
        const dates = allCommits
          .map((c) => parseISO(c.date))
          .sort((a, b) => a - b)
        const firstDate = format(dates[0], 'MMM d, yyyy')
        const lastDate = format(dates[dates.length - 1], 'MMM d, yyyy')
        dateRange = `${firstDate} - ${lastDate}`
      }

      // Prepare stats object for RecapScreen
      const recapStats = {
        totalCommits,
        totalRepos: repos.length,
        topRepos,
        mostActiveDay,
        mostActiveMonth,
        longestStreak,
        commitsByDay,
        topWords,
        messageStats,
      }

      // Render animated RecapScreen
      console.log('\n')
      const { unmount: unmountRecap } = render(
        React.createElement(RecapScreen, {
          stats: recapStats,
          year: targetYear,
          noAnimation: options.noAnimation || false,
          onSave: async (stats, year) => {
            try {
              const txtPath = await saveRecapToFile(stats, year)
              const jsonPath = await saveRecapAsJSON(stats, year)
              console.log(chalk.green(`\n✅ Recap saved to:`))
              console.log(chalk.cyan(`   ${txtPath}`))
              console.log(chalk.cyan(`   ${jsonPath}\n`))
            } catch (error) {
              console.error(
                chalk.red(`\n❌ Error saving recap: ${error.message}\n`)
              )
            }
          },
          onQuit: () => {
            unmountRecap()
            process.exit(0)
          },
        }),
        { exitOnCtrlC: true }
      )

      // Wait for user to exit (Ctrl+C) or let it finish
      // The RecapScreen will handle its own lifecycle

      // After RecapScreen finishes, show detailed statistics
      // (This will only show if RecapScreen unmounts, which happens on final screen)
      // For now, we'll show both - RecapScreen first, then detailed stats

      // Display statistics in organized sections
      console.log('\n')

      // Section 1: Overview
      const overviewLines = [
        chalk.cyan.bold('📈 Overview\n'),
        chalk.white(
          `Total Commits: ${chalk.green.bold(totalCommits.toLocaleString())}`
        ),
        chalk.white(`Total Repositories: ${chalk.green.bold(repos.length)}`),
        chalk.white(`Date Range: ${chalk.green.bold(dateRange)}`),
      ]

      console.log(
        boxen(overviewLines.join('\n'), {
          title: chalk.cyan.bold('GitHub Recap Statistics'),
          titleAlignment: 'center',
          padding: 1,
          margin: { top: 0, bottom: 1 },
          borderStyle: 'round',
          borderColor: 'cyan',
        })
      )

      // Section 2: Activity Patterns
      const activityLines = [chalk.cyan.bold('📅 Activity Patterns\n')]

      if (mostActiveDay) {
        activityLines.push(
          chalk.white(
            `Most Active Day: ${chalk.yellow.bold(
              mostActiveDay.dayName
            )} (${chalk.green.bold(
              format(parseISO(mostActiveDay.date), 'MMM d, yyyy')
            )}) with ${chalk.green.bold(mostActiveDay.count)} commits`
          )
        )
      }

      if (mostActiveMonth) {
        activityLines.push(
          chalk.white(
            `Most Active Month: ${chalk.yellow.bold(
              mostActiveMonth.monthName
            )} with ${chalk.green.bold(mostActiveMonth.count)} commits`
          )
        )
      }

      if (longestStreak) {
        activityLines.push(
          chalk.white(
            `Longest Streak: ${chalk.green.bold(
              longestStreak.days
            )} days (${chalk.yellow.bold(
              format(parseISO(longestStreak.startDate), 'MMM d')
            )} - ${chalk.yellow.bold(
              format(parseISO(longestStreak.endDate), 'MMM d')
            )})`
          )
        )
      }

      activityLines.push('')
      activityLines.push(chalk.yellow.bold('Commits by Day of Week:'))

      // Create simple bar chart for day of week
      const maxDayCount = Math.max(...commitsByDay.map((d) => d.count), 1)
      commitsByDay.forEach(({ day, count }) => {
        const barLength = Math.round((count / maxDayCount) * 20)
        const bar = '█'.repeat(barLength)
        const percentage =
          totalCommits > 0 ? ((count / totalCommits) * 100).toFixed(1) : 0
        activityLines.push(
          chalk.white(
            `  ${day.padEnd(9)} ${chalk.green(
              bar.padEnd(20)
            )} ${chalk.green.bold(count)} (${percentage}%)`
          )
        )
      })

      console.log(
        boxen(activityLines.join('\n'), {
          padding: 1,
          margin: { top: 0, bottom: 1 },
          borderStyle: 'round',
          borderColor: 'blue',
        })
      )

      // Section 3: Top Words
      if (topWords.length > 0) {
        const wordsLines = [
          chalk.cyan.bold('💬 Top Words in Commit Messages\n'),
        ]

        topWords.forEach((item, index) => {
          wordsLines.push(
            chalk.white(
              `  ${(index + 1).toString().padStart(2)}. ${chalk.yellow.bold(
                item.word.padEnd(15)
              )} ${chalk.green.bold(item.count)} times`
            )
          )
        })

        console.log(
          boxen(wordsLines.join('\n'), {
            padding: 1,
            margin: { top: 0, bottom: 1 },
            borderStyle: 'round',
            borderColor: 'magenta',
          })
        )
      }

      // Section 4: Commit Insights
      const insightsLines = [
        chalk.cyan.bold('💡 Commit Insights\n'),
        chalk.white(
          `Average Message Length: ${chalk.green.bold(
            messageStats.avgLength
          )} words`
        ),
      ]

      if (messageStats.shortestMsg) {
        insightsLines.push(
          chalk.white(
            `Shortest Message: ${chalk.gray(`"${messageStats.shortestMsg}"`)}`
          )
        )
      }

      if (messageStats.longestMsg) {
        insightsLines.push(
          chalk.white(
            `Longest Message: ${chalk.gray(`"${messageStats.longestMsg}"`)}`
          )
        )
      }

      if (messageStats.topFirstWords.length > 0) {
        const topFirst = messageStats.topFirstWords[0]
        insightsLines.push('')
        insightsLines.push(
          chalk.white(
            `Most Common First Word: ${chalk.yellow.bold(
              `"${topFirst.word}"`
            )} (${chalk.green.bold(topFirst.count)} times)`
          )
        )
        insightsLines.push(
          chalk.gray(
            `   💬 You said "${topFirst.word}" ${topFirst.count} times!`
          )
        )
      }

      console.log(
        boxen(insightsLines.join('\n'), {
          padding: 1,
          margin: { top: 0, bottom: 1 },
          borderStyle: 'round',
          borderColor: 'yellow',
        })
      )

      // Top Repositories Summary
      if (topRepos.length > 0) {
        const reposLines = [chalk.cyan.bold('🏆 Top Repositories\n')]

        topRepos.forEach((item, index) => {
          reposLines.push(
            chalk.white(
              `  ${index + 1}. ${chalk.blue.bold(
                item.repo.padEnd(40)
              )} ${chalk.green.bold(item.count.toLocaleString())} commits (${
                item.percentage
              }%)`
            )
          )
        })

        console.log(
          boxen(reposLines.join('\n'), {
            padding: 1,
            margin: { top: 0, bottom: 1 },
            borderStyle: 'round',
            borderColor: 'green',
          })
        )
      }

      console.log() // Final spacing
    }
  } catch (error) {
    // Handle errors gracefully with red color for visibility
    console.error(chalk.red.bold('\n❌ Error:\n'))
    console.error(chalk.red(error.message))
    console.error(
      chalk.gray('\nFor help, check the README or GitHub issues.\n')
    )

    // Exit with error code
    process.exit(1)
  }
}

// Run the main function
main()
