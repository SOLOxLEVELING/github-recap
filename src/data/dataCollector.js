/**
 * Data Collector Orchestrator
 *
 * Coordinates collection of GitHub data with parallel fetching and smart caching.
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
 * Collects commits from all repositories for a given year using batched parallel processing.
 *
 * @param {Object} options - Collection options
 * @param {number} options.year - Year to fetch commits for
 * @param {boolean} options.publicOnly - Only include public repositories
 * @param {string[]} options.excludeRepos - Repositories to exclude
 * @param {Array} options.repoList - Optional: specific repos to process (skips fetchAllRepos)
 * @param {boolean} options.noCache - Skip cache, always fetch fresh
 * @param {number} options.cacheMaxAge - Cache expiration in hours (default: 24)
 * @param {number} options.batchSize - Number of repos to fetch in parallel (default: 5)
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
    // Fetch repositories
    let repos
    if (repoList && repoList.length > 0) {
      repos = repoList
    } else {
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

    // Collect commits using batched parallel processing
    const allCommitsArray = []
    
    const BATCH_SIZE = options.batchSize || 5
    
    const batches = []
    for (let i = 0; i < repos.length; i += BATCH_SIZE) {
      batches.push(repos.slice(i, i + BATCH_SIZE))
    }

    for (const [batchIndex, batch] of batches.entries()) {
      const batchStart = batchIndex * BATCH_SIZE + 1
      const batchEnd = Math.min(batchStart + batch.length - 1, repos.length)
      
      state.currentRepo = `Batch ${batchIndex + 1}/${batches.length} (repos ${batchStart}-${batchEnd} of ${repos.length})`
      state.processedCount = batchStart - 1

      const batchPromises = batch.map((repo) =>
        fetchCommitsForRepo(repo.full_name, year)
          .catch((error) => {
            console.error(
              chalk.yellow(
                `\n⚠️  Warning: Could not fetch commits for ${repo.full_name}: ${error.message}`
              )
            )
            return []
          })
      )

      const batchResults = await Promise.all(batchPromises)

      batchResults.forEach((commits) => {
        allCommitsArray.push(...commits)
      })

      state.processedCount = batchEnd
      state.allCommits = allCommitsArray.length
    }

    // Save to cache
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
        // Cache save failed, continue anyway
      }
    }

    unmount()

    return allCommitsArray
  } catch (error) {
    // Unmount spinner on error
    unmount()
    throw error
  }
}
