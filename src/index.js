#!/usr/bin/env node

/**
 * Main entry point for the GitHub Recap CLI tool.
 *
 * This file initializes the CLI application, sets up command-line argument parsing,
 * loads environment variables, and orchestrates the flow of data collection,
 * statistics calculation, and UI rendering to display the user's GitHub year in review.
 */

import chalk from 'chalk'
import boxen from 'boxen'
import { testAuthentication } from './auth/githubAuth.js'
import { fetchAllRepos } from './data/fetchRepos.js'
import { collectAllCommits } from './data/dataCollector.js'
import { parseOptions } from './utils/cli.js'

// Parse CLI options
const options = parseOptions()

/**
 * Main function that runs the GitHub Recap application.
 * Tests authentication and displays success/error messages.
 */
async function main() {
  try {
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
        })

        // Display summary
        console.log('\n') // Add spacing before summary box

        const summaryLines = [
          chalk.cyan.bold('📊 Collection Summary\n'),
          chalk.white(`Repository: ${chalk.blue.bold(targetRepo.full_name)}`),
          chalk.white(
            `Total Commits Found: ${chalk.green.bold(
              repoCommits.length.toLocaleString()
            )}`
          ),
          '',
          chalk.yellow.bold('Sample Commits:'),
        ]

        // Add sample commits
        if (repoCommits.length > 0) {
          repoCommits.slice(0, 3).forEach((commit, index) => {
            const message =
              commit.message.length > 50
                ? commit.message.substring(0, 47) + '...'
                : commit.message.split('\n')[0]
            summaryLines.push(
              chalk.white(
                `  ${index + 1}. ${chalk.blue(
                  commit.sha.substring(0, 7)
                )} ${message}`
              )
            )
          })
          if (repoCommits.length > 3) {
            summaryLines.push(
              chalk.gray(`  ... and ${repoCommits.length - 3} more commits`)
            )
          }
        } else {
          summaryLines.push(chalk.gray('  No commits found'))
        }

        const summaryBox = boxen(summaryLines.join('\n'), {
          title: chalk.cyan.bold('GitHub Recap - Data Collection Complete'),
          titleAlignment: 'center',
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan',
        })

        console.log(summaryBox)
        console.log() // Add spacing after box
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
      })

      // Get repos list for summary (we need to fetch them again for the summary)
      repos = await fetchAllRepos({
        publicOnly: options.publicOnly || false,
        excludeRepos: options.exclude || [],
      })

      // Calculate commits per repository for summary
      const commitsByRepo = {}
      allCommits.forEach((commit) => {
        if (!commitsByRepo[commit.repo]) {
          commitsByRepo[commit.repo] = 0
        }
        commitsByRepo[commit.repo]++
      })

      // Sort repos by commit count (descending)
      const reposByCommits = Object.entries(commitsByRepo)
        .map(([repoName, count]) => ({ repoName, count }))
        .sort((a, b) => b.count - a.count)

      // Display final summary with boxen
      console.log('\n') // Add spacing before summary box

      const summaryLines = [
        chalk.cyan.bold('📊 Collection Summary\n'),
        chalk.white(
          `Total Repositories Processed: ${chalk.green.bold(repos.length)}`
        ),
        chalk.white(
          `Total Commits Found: ${chalk.green.bold(
            allCommits.length.toLocaleString()
          )}`
        ),
        '',
        chalk.yellow.bold('Top Repositories by Commits:'),
      ]

      // Add top 5 repos by commit count
      const topRepos = reposByCommits.slice(0, 5)
      if (topRepos.length > 0) {
        topRepos.forEach((item, index) => {
          const percentage = ((item.count / allCommits.length) * 100).toFixed(1)
          summaryLines.push(
            chalk.white(
              `  ${index + 1}. ${chalk.blue.bold(
                item.repoName
              )}: ${chalk.green.bold(
                item.count.toLocaleString()
              )} commits (${percentage}%)`
            )
          )
        })
      } else {
        summaryLines.push(chalk.gray('  No commits found in any repository'))
      }

      const summaryBox = boxen(summaryLines.join('\n'), {
        title: chalk.cyan.bold('GitHub Recap - Data Collection Complete'),
        titleAlignment: 'center',
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      })

      console.log(summaryBox)
      console.log() // Add spacing after box
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
