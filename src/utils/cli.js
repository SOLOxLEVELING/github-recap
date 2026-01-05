/**
 * CLI Utilities
 *
 * Provides command-line interface utilities and helpers.
 * Handles argument parsing using Commander, provides CLI formatting helpers,
 * and manages user interactions and input validation.
 */

import { Command } from 'commander'

/**
 * Sets up and configures all CLI options using Commander.
 *
 * Option parsing and filtering logic:
 * - --year: Specifies which year to fetch commits for
 * - --repo: Overrides everything - only fetches that specific repository
 * - --public-only: Filters repositories to only include public ones
 * - --exclude: Removes specified repositories from the list
 *
 * Option precedence:
 * 1. If --repo is specified, it overrides all other filtering options
 *    (we skip fetchAllRepos and only fetch that one repo)
 * 2. If --repo is NOT specified, we use fetchAllRepos with:
 *    - publicOnly: from --public-only flag
 *    - excludeRepos: from --exclude option (parsed as comma-separated array)
 *
 * @returns {Command} Configured Commander instance with all options
 */
export function setupCLI() {
  const program = new Command()

  program
    .name('github-recap')
    .description('Beautiful terminal-based GitHub year in review')
    .version('1.0.0')
    .option(
      '-y, --year <year>',
      'Year to fetch commits for (default: current year)',
      (value) => {
        const year = parseInt(value, 10)
        if (isNaN(year) || year < 2000 || year > 2100) {
          throw new Error('Year must be a valid number between 2000 and 2100')
        }
        return year
      }
    )
    .option(
      '-r, --repo <repo>',
      'Specific repository to fetch commits for (format: username/repo-name). Overrides all other filtering options.'
    )
    .option(
      '--public-only',
      'Only include public repositories (ignored if --repo is specified)',
      false
    )
    .option(
      '-e, --exclude <repos>',
      'Exclude specific repositories (comma-separated, format: repo1,repo2). Ignored if --repo is specified.',
      (value) => {
        // Parse comma-separated string into array
        // Trim whitespace from each repo name
        return value
          .split(',')
          .map((repo) => repo.trim())
          .filter((repo) => repo.length > 0)
      }
    )
    .option(
      '--no-animation',
      'Skip animated recap screens and show final summary immediately',
      false
    )
    .option(
      '--no-cache',
      'Skip cache, always fetch fresh data from GitHub',
      false
    )
    .option(
      '--refresh',
      'Alias for --no-cache (fetch fresh data)',
      false
    )
    .option(
      '--clear-cache',
      'Clear cache files and exit',
      false
    )
    .option(
      '--cache-max-age <hours>',
      'Set cache expiration in hours (default: 24)',
      (value) => {
        const hours = parseFloat(value)
        if (isNaN(hours) || hours < 0) {
          throw new Error('Cache max age must be a positive number')
        }
        return hours
      }
    )
    .addHelpText(
      'after',
      `
Examples:
  $ github-recap
  Fetch commits from all repositories for the current year

  $ github-recap --year 2023
  Fetch commits from all repositories for 2023

  $ github-recap --repo username/my-project
  Fetch commits from only "username/my-project" for current year

  $ github-recap --year 2023 --repo username/my-project
  Fetch commits from "username/my-project" for 2023

  $ github-recap --public-only
  Fetch commits from only public repositories

  $ github-recap --exclude "repo1,repo2,repo3"
  Fetch commits from all repos except repo1, repo2, and repo3

  $ github-recap --year 2023 --public-only --exclude "test-repo,demo-repo"
  Fetch commits from public repos (excluding test-repo and demo-repo) for 2023

  $ github-recap --refresh
  Fetch fresh data from GitHub (skip cache)

  $ github-recap --no-cache
  Same as --refresh (skip cache)

  $ github-recap --clear-cache
  Clear all cached data and exit

  $ github-recap --cache-max-age 12
  Use cache if less than 12 hours old (default: 24 hours)

Note:
  - When --repo is specified, --public-only and --exclude are ignored
  - Repository names in --exclude should match the full_name format (username/repo-name)
  - Cache is automatically used if data is less than 24 hours old (configurable)
  - Use --refresh or --no-cache to always fetch fresh data
`
    )

  return program
}

/**
 * Parses command-line arguments and returns the options object.
 *
 * @returns {Object} Parsed options with the following structure:
 *   - year: number | undefined (parsed year or undefined)
 *   - repo: string | undefined (repository name or undefined)
 *   - publicOnly: boolean (true if --public-only flag is set)
 *   - exclude: string[] | undefined (array of excluded repo names or undefined)
 */
export function parseOptions() {
  const program = setupCLI()
  program.parse(process.argv)
  return program.opts()
}
