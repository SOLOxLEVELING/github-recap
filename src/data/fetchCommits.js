/**
 * Commit Data Fetcher
 *
 * Fetches commit history from GitHub API for repositories within a specified year.
 */

import { getAuthenticatedClient } from '../auth/githubAuth.js'
import { startOfYear, endOfYear } from 'date-fns'

/**
 * Fetches all commits for a specific repository within a given year.
 *
 * @param {string} repoFullName - Full repository name (e.g., "username/repo-name")
 * @param {number} year - Year to fetch commits for (e.g., 2024)
 * @returns {Promise<Array>} Array of simplified commit objects
 * @throws {Error} If API request fails or repository is inaccessible
 */
export async function fetchCommitsForRepo(repoFullName, year) {
  try {
    const octokit = getAuthenticatedClient()

    // Parse repository name
    const [owner, repo] = repoFullName.split('/')
    if (!owner || !repo) {
      throw new Error(
        `Invalid repository name format: ${repoFullName}\n` +
          'Expected format: "username/repo-name"'
      )
    }

    // Calculate date range for the year
    const yearStart = startOfYear(new Date(year, 0, 1))
    const yearEnd = endOfYear(new Date(year, 0, 1))
    const since = yearStart.toISOString()
    const until = yearEnd.toISOString()

    // Fetch all commits within date range
    const commits = await octokit.paginate(octokit.rest.repos.listCommits, {
      owner,
      repo,
      since,
      until,
      per_page: 100,
    })

    // Extract only necessary data from commit objects
    const simplifiedCommits = commits.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      date: commit.commit.author.date,
      repo: repoFullName,
    }))

    return simplifiedCommits
  } catch (error) {
    // Handle common error cases gracefully
    if (error.status === 404 || error.status === 409 || error.status === 403) {
      return [] // Repository not found, empty, or no access
    }

    if (error.status === 429) {
      throw new Error(
        '❌ GitHub API rate limit exceeded!\n\n' +
          'Please wait a few minutes and try again.\n' +
          'GitHub allows 5000 requests per hour for authenticated users.'
      )
    }

    if (error.message.includes('Invalid repository name')) {
      throw error
    }

    // Log warning but continue processing
    console.warn(
      `⚠️  Warning: Could not fetch commits for ${repoFullName}: ${error.message}`
    )
    return []
  }
}
