/**
 * Data Collector Orchestrator
 *
 * Coordinates the collection of all GitHub data by calling fetchRepos and fetchCommits.
 * Aggregates data from multiple sources, handles pagination, filters data by date range
 * (current year), and structures the collected data for statistical analysis.
 *
 * How Ink's React components work in terminal:
 * - Ink is a React renderer for CLI applications
 * - Instead of rendering to DOM, it renders to terminal/console
 * - Components update in real-time using React's state management
 * - We use useState and useEffect hooks just like in web React
 * - The render() function from Ink displays the component in the terminal
 * - Components re-render when state changes, updating the terminal output
 * - This allows for animated spinners, progress bars, and live updates
 */

import React, { useState, useEffect } from 'react'
import { render, Box, Text } from 'ink'
import Spinner from 'ink-spinner'
import chalk from 'chalk'
import { fetchAllRepos } from './fetchRepos.js'
import { fetchCommitsForRepo } from './fetchCommits.js'
import {
  isCacheValid,
  loadFromCache,
  saveToCache,
  formatCacheAge,
} from '../cache/cacheManager.js'
import { testAuthentication } from '../auth/githubAuth.js'

/**
 * Loading Spinner Component
 *
 * Displays real-time progress while collecting commits from multiple repositories.
 * Uses Ink's React components to create an animated, updating terminal UI.
 *
 * @param {Object} props
 * @param {string} props.currentRepo - Name of the repository currently being processed
 * @param {number} props.processedCount - Number of repositories processed so far
 * @param {number} props.totalCount - Total number of repositories to process
 * @param {number} props.allCommits - Total number of commits collected so far
 */
function LoadingSpinner({ currentRepo, processedCount, totalCount, allCommits }) {
  return React.createElement(
    Box,
    { flexDirection: 'column', padding: 1 },
    React.createElement(
      Box,
      null,
      React.createElement(
        Text,
        null,
        chalk.blue.bold('<'),
        React.createElement(Spinner, { type: 'dots' }),
        chalk.blue.bold('>'),
        ' ',
        chalk.white('Processing repository'),
        ' ',
        chalk.green.bold(processedCount),
        '/',
        chalk.green.bold(totalCount),
        ': ',
        chalk.cyan.bold(currentRepo || 'Starting...')
      )
    ),
    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(
        Text,
        null,
        chalk.gray('Total commits collected:'),
        ' ',
        chalk.green.bold(allCommits.toLocaleString())
      )
    )
  )
}

/**
 * Collects commits from all repositories for a given year.
 *
 * Data aggregation pattern:
 * - We fetch all repositories first (with filtering options)
 * - Then iterate through each repository sequentially
 * - For each repo, we fetch commits and add them to a master array
 * - This creates a flat array of all commits from all repos
 * - Each commit object includes the repo name for reference
 * - This pattern allows us to analyze commits across all repos together
 *
 * Why we catch errors per repo instead of stopping:
 * - Some repos might be empty (no commits in the year)
 * - Some repos might have access issues (private repos, permissions)
 * - Some repos might be archived or deleted
 * - If one repo fails, we don't want to lose data from all other repos
 * - This makes the tool more resilient and user-friendly
 * - We log warnings for failed repos but continue processing
 * - The user gets partial results instead of complete failure
 *
 * @param {Object} options - Collection options
 * @param {number} options.year - Year to fetch commits for
 * @param {boolean} options.publicOnly - Only include public repositories
 * @param {string[]} options.excludeRepos - Repositories to exclude
 * @param {Array} options.repoList - Optional: specific repos to process (skips fetchAllRepos)
 * @param {boolean} options.noCache - Skip cache, always fetch fresh
 * @param {number} options.cacheMaxAge - Cache expiration in hours (default: 24)
 * @param {string} options.username - GitHub username (for cache key)
 * @returns {Promise<Array>} Array of all commits from all repositories
 */
export async function collectAllCommits(options) {
  const {
    year,
    publicOnly = false,
    excludeRepos = [],
    repoList = null,
    noCache = false,
    cacheMaxAge = 24,
    username = null,
  } = options

  // Check cache BEFORE rendering progress component (for faster response)
  let currentUsername = username
  if (currentUsername && !noCache && !repoList) {
    const cacheCheck = await isCacheValid(currentUsername, year, cacheMaxAge)
    
    if (cacheCheck.valid) {
      // Load from cache
      const cachedData = await loadFromCache(currentUsername, year)
      
      if (cachedData && cachedData.commits) {
        const ageStr = formatCacheAge(cacheCheck.age)
        console.log(
          chalk.green(`📦 Using cached data (fetched ${ageStr})`)
        )
        console.log(
          chalk.gray('   Run with --refresh to fetch new data\n')
        )
        return cachedData.commits
      }
    }
  }

  // Cache invalid or noCache set - fetch fresh data
  if (currentUsername && !noCache && !repoList) {
    console.log(chalk.yellow('🔄 Fetching fresh data from GitHub...\n'))
  }

  // Shared state object that the component will read from
  // This allows us to update the component from outside React's render cycle
  const state = {
    currentRepo: 'Starting...',
    processedCount: 0,
    totalCount: 0,
    allCommits: 0,
  }

  // Component that reads from shared state and updates when state changes
  function ProgressComponent() {
    const [progress, setProgress] = React.useState(state)

    // Use effect to poll for state changes
    // This allows external code to update the state object and trigger re-renders
    React.useEffect(() => {
      const interval = setInterval(() => {
        setProgress({ ...state })
      }, 100) // Update every 100ms for smooth animation

      return () => clearInterval(interval)
    }, [])

    return React.createElement(LoadingSpinner, {
      currentRepo: progress.currentRepo,
      processedCount: progress.processedCount,
      totalCount: progress.totalCount,
      allCommits: progress.allCommits,
    })
  }

  // Render the progress component
  const { unmount } = render(
    React.createElement(ProgressComponent),
    { exitOnCtrlC: false }
  )

  try {

    // Step 1: Fetch all repositories (or use provided repo list)
    let repos
    if (repoList && repoList.length > 0) {
      // Use provided repo list (e.g., when --repo is specified)
      repos = repoList
    } else {
      // Fetch all repos with filtering options
      repos = await fetchAllRepos({
        publicOnly,
        excludeRepos,
      })
    }

    state.totalCount = repos.length
    state.currentRepo = repoList ? 'Processing repository...' : 'Fetching repositories...'
    state.processedCount = 0
    state.allCommits = 0

    if (repos.length === 0) {
      unmount()
      return []
    }

    // Step 2: Collect commits from all repositories
    const allCommitsArray = []

    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i]
      const repoName = repo.full_name

      // Update state for spinner
      state.currentRepo = repoName
      state.processedCount = i

      try {
        // Fetch commits for this repository
        const commits = await fetchCommitsForRepo(repoName, year)

        // Add commits to master array
        // Each commit already has the repo name in it (from fetchCommitsForRepo)
        allCommitsArray.push(...commits)

        // Update state with new commit count
        state.processedCount = i + 1
        state.allCommits = allCommitsArray.length
      } catch (error) {
        // Error handling per repository:
        // - Don't stop the entire process if one repo fails
        // - Log a warning but continue with other repos
        // - This makes the tool resilient to individual repo issues
        console.error(
          chalk.yellow(
            `\n⚠️  Warning: Could not fetch commits for ${repoName}: ${error.message}`
          )
        )
        // Continue to next repo
        state.processedCount = i + 1
        state.allCommits = allCommitsArray.length
      }
    }

    // Step 3: Save to cache if username is available
    if (currentUsername && !repoList) {
      try {
        await saveToCache(currentUsername, year, {
          repos,
          commits: allCommitsArray,
        })
        if (!noCache) {
          console.log(chalk.green('💾 Data cached for future use\n'))
        }
      } catch (cacheError) {
        // Cache save failed, but don't fail the entire operation
        // Error already logged in saveToCache
      }
    }

    // Step 4: Unmount the loading spinner
    unmount()

    return allCommitsArray
  } catch (error) {
    // Unmount spinner on error
    unmount()
    throw error
  }
}
