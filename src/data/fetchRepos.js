/**
 * Repository Data Fetcher
 *
 * Fetches repository data from GitHub API for the authenticated user.
 * Retrieves information about repositories including stars, forks, languages,
 * creation dates, and other metadata needed for the year recap statistics.
 */

import { getAuthenticatedClient } from '../auth/githubAuth.js'

/**
 * Fetches all repositories for the authenticated user.
 *
 * Why pagination is necessary:
 * - GitHub API returns a maximum of 100 repositories per page
 * - Users with many repositories (100+) would only get partial data without pagination
 * - Pagination ensures we collect ALL repositories, not just the first page
 * - This is critical for accurate statistics and year-in-review data
 *
 * How octokit.paginate() works:
 * - Automatically handles multiple API requests behind the scenes
 * - Follows the "Link" header from GitHub responses to get next pages
 * - Collects all pages into a single array
 * - Handles rate limiting and retries automatically
 * - Much simpler than manually managing page numbers and Link headers
 *
 * @param {Object} options - Configuration options for fetching repositories
 * @param {boolean} options.publicOnly - If true, only returns public repositories
 * @param {string[]} options.excludeRepos - Array of repository full names to exclude (e.g., ['username/repo-name'])
 * @returns {Promise<Array>} Array of repository objects with selected fields
 * @throws {Error} If API request fails or authentication is invalid
 */
export async function fetchAllRepos(options = {}) {
  const { publicOnly = false, excludeRepos = [] } = options

  try {
    // Get authenticated Octokit client
    const octokit = getAuthenticatedClient()

    // Why we use octokit.paginate():
    // The GitHub API endpoint GET /user/repos returns paginated results.
    // Without pagination, we'd only get the first 100 repos (default per_page).
    // octokit.paginate() automatically:
    // 1. Makes the first request
    // 2. Checks the response headers for pagination links
    // 3. Makes additional requests for remaining pages
    // 4. Combines all results into a single array
    // 5. Handles rate limiting and retries
    const allRepos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
      // Request all fields we might need
      per_page: 100, // Maximum allowed by GitHub API
      sort: 'created', // Sort by creation date (oldest first)
      direction: 'asc', // Ascending order
    })

    // Filtering logic:
    // 1. First, filter by publicOnly if specified
    //    - Some users may only want to analyze public contributions
    //    - Private repos require special permissions and may not be relevant for public recap
    let filteredRepos = publicOnly
      ? allRepos.filter((repo) => !repo.private)
      : allRepos

    // 2. Then, exclude specific repositories if provided
    //    - Useful for filtering out forks, archived repos, or test repos
    //    - excludeRepos should contain full names like 'username/repo-name'
    if (excludeRepos.length > 0) {
      filteredRepos = filteredRepos.filter(
        (repo) => !excludeRepos.includes(repo.full_name)
      )
    }

    // Extract only the fields we need for the recap
    // This reduces memory usage and makes the data structure predictable
    const repos = filteredRepos.map((repo) => ({
      name: repo.name, // Repository name (e.g., "my-project")
      full_name: repo.full_name, // Full name with owner (e.g., "username/my-project")
      language: repo.language, // Primary programming language (null if no code detected)
      private: repo.private, // Whether the repo is private
      created_at: repo.created_at, // ISO 8601 date string of creation date
    }))

    return repos
  } catch (error) {
    // Handle different types of API errors
    if (error.status === 401) {
      throw new Error(
        '❌ Authentication failed while fetching repositories!\n\n' +
          'Your GITHUB_TOKEN may have expired or been revoked.\n' +
          'Please generate a new token at https://github.com/settings/tokens'
      )
    } else if (error.status === 403) {
      throw new Error(
        '❌ Access forbidden while fetching repositories!\n\n' +
          'Your GITHUB_TOKEN does not have the "repo" scope.\n' +
          'Please update your token with the required permissions.'
      )
    } else if (error.status === 404) {
      throw new Error(
        '❌ User not found!\n\n' +
          'The authenticated user could not be found. This is unusual.'
      )
    } else {
      throw new Error(
        `❌ Failed to fetch repositories: ${error.message}\n\n` +
          'Please check your internet connection and try again.'
      )
    }
  }
}
