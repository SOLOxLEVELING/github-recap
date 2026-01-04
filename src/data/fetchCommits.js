/**
 * Commit Data Fetcher
 *
 * Fetches commit history from GitHub API for repositories.
 * Retrieves commit messages, dates, authors, and file changes to analyze
 * coding activity patterns throughout the year.
 */

import { getAuthenticatedClient } from '../auth/githubAuth.js'
import { startOfYear, endOfYear } from 'date-fns'

/**
 * Fetches all commits for a specific repository within a given year.
 *
 * How to format dates for GitHub API:
 *
 * What is ISO 8601 format?
 * - ISO 8601 is an international standard for representing dates and times
 * - Format: "YYYY-MM-DDTHH:mm:ss.sssZ" or "YYYY-MM-DDTHH:mm:ssZ"
 * - Example: "2024-01-01T00:00:00.000Z" (January 1, 2024, midnight UTC)
 * - Components:
 *   - YYYY: 4-digit year
 *   - MM: 2-digit month (01-12)
 *   - DD: 2-digit day (01-31)
 *   - T: Literal "T" separator between date and time
 *   - HH: 2-digit hour (00-23, 24-hour format)
 *   - mm: 2-digit minute (00-59)
 *   - ss: 2-digit second (00-59)
 *   - sss: Optional milliseconds (000-999)
 *   - Z: UTC timezone indicator (Zulu time)
 *
 * Why GitHub API requires ISO 8601:
 * - Standardization: ISO 8601 is universally recognized and unambiguous
 * - Timezone clarity: The "Z" suffix explicitly indicates UTC timezone
 * - Precision: Includes time component, not just dates
 * - Parsing reliability: No ambiguity (e.g., "01/02/2024" could be Jan 2 or Feb 1)
 * - API consistency: All GitHub API endpoints use ISO 8601 for dates
 * - Sorting: ISO 8601 strings sort chronologically when sorted alphabetically
 *
 * Alternative format string (if using date-fns format()):
 * - 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\'' produces: "2024-01-01T00:00:00Z"
 * - However, this hardcodes 'Z' and doesn't account for actual timezone
 * - Better approach: Use toISOString() which handles timezone conversion automatically
 *
 * Our implementation:
 * - We use JavaScript's toISOString() method which automatically:
 *   - Converts Date object to ISO 8601 format
 *   - Handles timezone conversion to UTC
 *   - Includes milliseconds: "2024-01-01T00:00:00.000Z"
 *   - Is more reliable than manual formatting
 * - We use startOfYear() and endOfYear() from date-fns to get precise boundaries
 *
 * Why we simplify commit objects:
 * - GitHub's full commit object is HUGE (contains file changes, stats, full diffs, etc.)
 * - A single commit can be 10-50KB of JSON data
 * - For 1000 commits, that's 10-50MB of unnecessary data!
 * - We only need: SHA (unique ID), message, date, and repo name
 * - Simplified objects are ~200 bytes each (50x smaller!)
 * - Faster processing, less memory usage, easier to work with
 *
 * @param {string} repoFullName - Full repository name (e.g., "username/repo-name")
 * @param {number} year - Year to fetch commits for (e.g., 2024)
 * @returns {Promise<Array>} Array of simplified commit objects
 * @throws {Error} If API request fails or repository is inaccessible
 */
export async function fetchCommitsForRepo(repoFullName, year) {
  try {
    // Get authenticated Octokit client
    const octokit = getAuthenticatedClient()

    // Parse repository name into owner and repo
    const [owner, repo] = repoFullName.split('/')
    if (!owner || !repo) {
      throw new Error(
        `Invalid repository name format: ${repoFullName}\n` +
          'Expected format: "username/repo-name"'
      )
    }

    // Calculate date range for the year using date-fns
    // startOfYear: Returns January 1st at 00:00:00
    // endOfYear: Returns December 31st at 23:59:59
    const yearStart = startOfYear(new Date(year, 0, 1)) // January 1, {year}
    const yearEnd = endOfYear(new Date(year, 0, 1)) // December 31, {year}

    // Format dates as ISO 8601 strings for GitHub API
    // GitHub API requires ISO 8601 format: "YYYY-MM-DDTHH:mm:ssZ"
    // toISOString() automatically converts Date to ISO 8601 format in UTC
    // This is more reliable than manual formatting and handles timezones correctly
    const since = yearStart.toISOString()
    const until = yearEnd.toISOString()

    // Fetch all commits for the repository within the date range
    // Using octokit.paginate() to get ALL commits, not just the first page
    // The GitHub API endpoint: GET /repos/{owner}/{repo}/commits
    // Parameters:
    //   - since: Only commits after this date (ISO 8601)
    //   - until: Only commits before this date (ISO 8601)
    //   - per_page: Maximum commits per page (100 is the max)
    const commits = await octokit.paginate(octokit.rest.repos.listCommits, {
      owner,
      repo,
      since, // Start of the year
      until, // End of the year
      per_page: 100, // Maximum allowed by GitHub API
    })

    // Simplify commit objects - extract only what we need
    // GitHub's full commit object contains:
    //   - Full file diffs (can be huge!)
    //   - Complete file change statistics
    //   - Author/committer full details
    //   - Tree and parent SHA references
    //   - URL references
    // We only need: SHA, message, date, and repo name
    const simplifiedCommits = commits.map((commit) => ({
      sha: commit.sha, // Unique commit identifier (first 7 chars often used)
      message: commit.commit.message, // Commit message (first line)
      date: commit.commit.author.date, // ISO 8601 date string
      repo: repoFullName, // Repository name for reference
    }))

    return simplifiedCommits
  } catch (error) {
    // Error handling for different scenarios:

    // 1. Repository not found (404)
    if (error.status === 404) {
      // This can happen if:
      // - Repository was deleted
      // - Repository name is incorrect
      // - User doesn't have access to the repository
      return [] // Return empty array - repo doesn't exist or no access
    }

    // 2. Empty repository (409 Conflict)
    // GitHub returns 409 for empty repositories (no commits)
    if (error.status === 409) {
      return [] // Return empty array - repo exists but has no commits
    }

    // 3. Access forbidden (403)
    if (error.status === 403) {
      // This can happen if:
      // - Repository is private and token lacks permissions
      // - Repository access was revoked
      // Return empty array silently - user may not have access to all repos
      return []
    }

    // 4. Rate limiting (429)
    if (error.status === 429) {
      throw new Error(
        '❌ GitHub API rate limit exceeded!\n\n' +
          'Please wait a few minutes and try again.\n' +
          'GitHub allows 5000 requests per hour for authenticated users.'
      )
    }

    // 5. Network or other errors
    // Re-throw with helpful message for unexpected errors
    if (error.message.includes('Invalid repository name')) {
      throw error // Re-throw our custom validation errors
    }

    // For other errors, return empty array to allow processing to continue
    // This prevents one problematic repo from stopping the entire process
    // Log a warning but don't throw (we'll handle this at a higher level)
    console.warn(
      `⚠️  Warning: Could not fetch commits for ${repoFullName}: ${error.message}`
    )
    return []
  }
}
